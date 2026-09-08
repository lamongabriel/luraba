import {
  transactionAnalyticsQuerySchema,
  transactionAnalyticsSchema,
} from "@luraba/contracts/transactions";
import {
  clampDateToToday,
  differenceInCalendarDays,
  formatISODate,
  getTodayInTimezone,
  parseISODate,
  startOfMonth,
  startOfWeek,
  subDays,
} from "@luraba/domain";
import { eq } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { householdsTable } from "@/db/schemas/households.schema";
import { authRepository } from "@/modules/auth/auth.repository";
import { fxService } from "@/modules/fx/fx.service";
import * as repository from "./transactions.analytics.repository";
import type { TransactionFilterQuery } from "./transactions.query";

type ConvertedRow = repository.TransactionAnalyticsAggregateRow & { amount: number };

function clampDates(query: TransactionFilterQuery, today: string) {
  return {
    ...query,
    dateTo: query.dateTo ? clampDateToToday(query.dateTo, today) : today,
  };
}

function chooseBucket(from: string | null, to: string | null): "day" | "week" | "month" {
  if (!from || !to) return "month";
  const days = differenceInCalendarDays(parseISODate(to), parseISODate(from));
  return days <= 45 ? "day" : days <= 240 ? "week" : "month";
}

function bucketDate(value: string, bucket: "day" | "week" | "month"): string {
  const date = parseISODate(value);
  if (bucket === "day") return value;
  if (bucket === "week") return formatISODate(startOfWeek(date, { weekStartsOn: 1 }));
  return formatISODate(startOfMonth(date));
}

function percentageChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(2));
}

async function resolveCurrency(context: HouseholdContext): Promise<string> {
  const preferences = await authRepository.getUserPreferences(context.userId);
  if (preferences?.currency) return preferences.currency;
  const rows = await db
    .select({ currencyCode: householdsTable.defaultCurrencyId })
    .from(householdsTable)
    .where(eq(householdsTable.id, context.householdId));
  return rows[0]?.currencyCode ?? "USD";
}

async function convertRows(
  rows: repository.TransactionAnalyticsAggregateRow[],
  targetCurrency: string,
): Promise<ConvertedRow[]> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      amount:
        row.currencyCode === targetCurrency
          ? row.amount
          : await fxService.convertAmount({
              amount: row.amount,
              fromCurrencyCode: row.currencyCode,
              toCurrencyCode: targetCurrency,
              date: parseISODate(row.date),
            }),
    })),
  );
}

function metric(
  rows: ConvertedRow[],
  kind: "moneyIn" | "moneyOut" | "net",
  bucket: "day" | "week" | "month",
) {
  const values = new Map<string, number>();
  for (const row of rows) {
    const signed = row.originType === "income" ? row.amount : -row.amount;
    const value =
      kind === "moneyIn"
        ? row.originType === "income"
          ? row.amount
          : 0
        : kind === "moneyOut"
          ? row.originType === "income"
            ? 0
            : row.amount
          : signed;
    if (value !== 0) {
      const key = bucketDate(row.date, bucket);
      values.set(key, (values.get(key) ?? 0) + value);
    }
  }
  return Array.from(values, ([date, value]) => ({ date, value })).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

function createMetric(
  currentRows: ConvertedRow[],
  previousRows: ConvertedRow[],
  kind: "moneyIn" | "moneyOut" | "net",
  bucket: "day" | "week" | "month",
) {
  const currentTrend = metric(currentRows, kind, bucket);
  const previousTrend = metric(previousRows, kind, bucket);
  const value = currentTrend.reduce((total, row) => total + row.value, 0);
  const previousValue =
    previousRows.length > 0 ? previousTrend.reduce((total, row) => total + row.value, 0) : null;
  return {
    value,
    previousValue,
    changePercent: percentageChange(value, previousValue),
    trend: currentTrend,
  };
}

export async function getAnalytics(context: HouseholdContext, input: TransactionFilterQuery) {
  const parsed = transactionAnalyticsQuerySchema.parse(input);
  const today = formatISODate(getTodayInTimezone(context.timezone));
  const query = clampDates(parsed, today);
  const currencyCode = await resolveCurrency(context);
  const currentRows = await repository.aggregateTransactionFeed(context.householdId, query, today);

  let previousRows: repository.TransactionAnalyticsAggregateRow[] = [];
  let previousFrom: string | null = null;
  let previousTo: string | null = null;
  if (query.dateFrom && query.dateTo) {
    const span =
      differenceInCalendarDays(parseISODate(query.dateTo), parseISODate(query.dateFrom)) + 1;
    previousTo = formatISODate(subDays(parseISODate(query.dateFrom), 1));
    previousFrom = formatISODate(subDays(parseISODate(previousTo), span - 1));
    previousRows = await repository.aggregateTransactionFeed(
      context.householdId,
      { ...query, dateFrom: previousFrom, dateTo: previousTo },
      today,
    );
  }

  const [current, previous] = await Promise.all([
    convertRows(currentRows, currencyCode),
    convertRows(previousRows, currencyCode),
  ]);
  const bucket = chooseBucket(query.dateFrom ?? null, query.dateTo ?? null);
  const breakdown = new Map<
    string,
    {
      id: string | null;
      name: string;
      icon: string | null;
      color: string | null;
      amount: number;
    }
  >();
  for (const row of current) {
    if (row.originType === "income") continue;
    const key = row.categoryId ?? "uncategorized";
    const item = breakdown.get(key) ?? {
      id: row.categoryId,
      name: row.categoryName ?? "Uncategorized",
      icon: row.categoryIcon,
      color: row.categoryColor,
      amount: 0,
    };
    item.amount += row.amount;
    breakdown.set(key, item);
  }
  const sortedBreakdown = Array.from(breakdown.values()).sort((a, b) => b.amount - a.amount);
  const top = sortedBreakdown.slice(0, 10);
  if (sortedBreakdown.length > 10) {
    top.push({
      id: null,
      name: "Other",
      icon: null,
      color: null,
      amount: sortedBreakdown.slice(10).reduce((total, item) => total + item.amount, 0),
    });
  }
  const totalExpense = top.reduce((total, item) => total + item.amount, 0);

  return transactionAnalyticsSchema.parse({
    currencyCode,
    dateFrom: query.dateFrom ?? null,
    dateTo: query.dateTo ?? null,
    metrics: {
      moneyIn: createMetric(current, previous, "moneyIn", bucket),
      moneyOut: createMetric(current, previous, "moneyOut", bucket),
      net: createMetric(current, previous, "net", bucket),
    },
    expenseBreakdown: {
      items: top.map((item) => ({
        ...item,
        percentage:
          totalExpense === 0 ? 0 : Number(((item.amount / totalExpense) * 100).toFixed(2)),
      })),
    },
  });
}
