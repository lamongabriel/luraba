import type { AccountInsights } from "@luraba/contracts/accounts";
import {
  addDays,
  clampDateToToday,
  differenceInCalendarDays,
  formatISODate,
  getTodayInTimezone,
  parseISODate,
  startOfMonth,
  startOfWeek,
  subDays,
} from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { ledgerAccountsRepository } from "@/modules/ledger-accounts/ledger-accounts.repository";
import { NotFoundError } from "@/shared/errors";
import * as repository from "./accounts.insights.repository";
import { accountsRepository } from "./accounts.repository";

type Bucket = AccountInsights["bucket"];
type Totals = Pick<AccountInsights["totals"], "moneyIn" | "moneyOut" | "net" | "totalSpent">;

const MAX_CATEGORIES = 8;

export function chooseBucket(dateFrom: string, dateTo: string): Bucket {
  const days = differenceInCalendarDays(parseISODate(dateTo), parseISODate(dateFrom)) + 1;
  return days <= 45 ? "day" : days <= 240 ? "week" : "month";
}

export function bucketKey(value: string, bucket: Bucket): string {
  if (bucket === "day") return value;
  const date = parseISODate(value);
  return formatISODate(
    bucket === "week" ? startOfWeek(date, { weekStartsOn: 1 }) : startOfMonth(date),
  );
}

function totalsOf(rows: repository.InsightsRow[], sign: 1 | -1): Totals {
  let moneyIn = 0;
  let moneyOut = 0;
  let totalSpent = 0;
  for (const row of rows) {
    if (row.type === "adjustment") continue;
    const delta = row.amount * sign;
    if (delta > 0) moneyIn += delta;
    else moneyOut += -delta;
    if (row.type === "expense" && delta < 0) totalSpent += -delta;
  }
  return { moneyIn, moneyOut, net: moneyIn - moneyOut, totalSpent };
}

function percentage(part: number, total: number): number {
  return total === 0 ? 0 : Number(((part / total) * 100).toFixed(2));
}

function buildCategories(rows: repository.InsightsRow[], sign: 1 | -1) {
  const byCategory = new Map<
    string,
    { id: string | null; name: string; icon: string | null; color: string | null; amount: number }
  >();
  for (const row of rows) {
    const delta = row.amount * sign;
    if (row.type !== "expense" || delta >= 0) continue;
    const key = row.categoryId ?? "uncategorized";
    const item = byCategory.get(key) ?? {
      id: row.categoryId,
      name: row.categoryName ?? "Uncategorized",
      icon: row.categoryIcon,
      color: row.categoryColor,
      amount: 0,
    };
    item.amount += -delta;
    byCategory.set(key, item);
  }
  const sorted = Array.from(byCategory.values()).sort((a, b) => b.amount - a.amount);
  const top = sorted.slice(0, MAX_CATEGORIES);
  if (sorted.length > MAX_CATEGORIES) {
    top.push({
      id: null,
      name: "Other",
      icon: null,
      color: null,
      amount: sorted.slice(MAX_CATEGORIES).reduce((total, item) => total + item.amount, 0),
    });
  }
  const total = top.reduce((sum, item) => sum + item.amount, 0);
  return top.map((item) => ({ ...item, percentage: percentage(item.amount, total) }));
}

/** Walks every day of the range so balances carry forward through quiet days and buckets. */
function buildSeries(
  rows: repository.InsightsRow[],
  sign: 1 | -1,
  opening: number,
  dateFrom: string,
  dateTo: string,
  bucket: Bucket,
) {
  const deltaByDay = new Map<string, number>();
  const flowByBucket = new Map<string, { moneyIn: number; moneyOut: number }>();
  for (const row of rows) {
    const delta = row.amount * sign;
    deltaByDay.set(row.date, (deltaByDay.get(row.date) ?? 0) + delta);
    if (row.type === "adjustment") continue;
    const key = bucketKey(row.date, bucket);
    const flow = flowByBucket.get(key) ?? { moneyIn: 0, moneyOut: 0 };
    if (delta > 0) flow.moneyIn += delta;
    else flow.moneyOut += -delta;
    flowByBucket.set(key, flow);
  }

  const history = new Map<string, number>();
  let balance = opening;
  const end = parseISODate(dateTo);
  for (let day = parseISODate(dateFrom); day <= end; day = addDays(day, 1)) {
    const iso = formatISODate(day);
    balance += deltaByDay.get(iso) ?? 0;
    history.set(bucketKey(iso, bucket), balance);
  }

  const buckets = Array.from(history.keys());
  return {
    balanceHistory: buckets.map((date) => ({ date, balance: history.get(date) ?? opening })),
    cashFlow: buckets.map((date) => ({
      date,
      moneyIn: flowByBucket.get(date)?.moneyIn ?? 0,
      moneyOut: flowByBucket.get(date)?.moneyOut ?? 0,
    })),
    closing: balance,
  };
}

export async function getAccountInsights(
  context: HouseholdContext,
  accountId: string,
  query: { dateFrom?: string; dateTo?: string },
): Promise<AccountInsights> {
  const account = await accountsRepository.get(accountId, context);
  if (!account || account.type === "credit_card") throw new NotFoundError("Account");
  const ledger = await ledgerAccountsRepository.findByOwner("account", account.id);
  if (!ledger) throw new NotFoundError("Account ledger");

  const sign = account.classification === "asset" ? 1 : -1;
  const today = formatISODate(getTodayInTimezone(context.timezone));
  const dateTo = query.dateTo ? clampDateToToday(query.dateTo, today) : today;
  const first = query.dateFrom
    ? null
    : await repository.firstPostedDate(context.householdId, ledger.id);
  const requestedFrom = query.dateFrom ?? first ?? dateTo;
  const dateFrom = requestedFrom > dateTo ? dateTo : requestedFrom;

  const days = differenceInCalendarDays(parseISODate(dateTo), parseISODate(dateFrom)) + 1;
  const previousTo = formatISODate(subDays(parseISODate(dateFrom), 1));
  const previousFrom = formatISODate(subDays(parseISODate(previousTo), days - 1));
  const hasPrevious = query.dateFrom !== undefined;

  const [rows, openingRaw, highlights, previousRows, previousOpeningRaw] = await Promise.all([
    repository.listLedgerRows(context.householdId, ledger.id, dateFrom, dateTo),
    repository.sumBefore(context.householdId, ledger.id, dateFrom),
    repository.listExpenseHighlights(context.householdId, ledger.id, dateFrom, dateTo),
    hasPrevious
      ? repository.listLedgerRows(context.householdId, ledger.id, previousFrom, previousTo)
      : Promise.resolve([]),
    hasPrevious ? repository.sumBefore(context.householdId, ledger.id, previousFrom) : 0,
  ]);

  const bucket = chooseBucket(dateFrom, dateTo);
  const opening = openingRaw * sign;
  const series = buildSeries(rows, sign, opening, dateFrom, dateTo, bucket);
  const totals = totalsOf(rows, sign);
  // A previous period that starts before the first entry has nothing to compare against.
  const previousHasData = previousRows.length > 0 || previousOpeningRaw !== 0;

  return {
    currencyCode: account.currencyId,
    classification: account.classification,
    dateFrom,
    dateTo,
    bucket,
    balance: { opening, closing: series.closing },
    totals: {
      ...totals,
      transactionCount: rows
        .filter((row) => row.type !== "adjustment")
        .reduce((total, row) => total + row.count, 0),
      averageDailySpend: Math.round(totals.totalSpent / days),
      savingsRate: totals.moneyIn === 0 ? null : percentage(totals.net, totals.moneyIn),
      largestExpense: highlights.largest,
    },
    previous: hasPrevious && previousHasData ? totalsOf(previousRows, sign) : null,
    balanceHistory: series.balanceHistory,
    cashFlow: series.cashFlow,
    categories: buildCategories(rows, sign),
    topMerchants: highlights.merchants,
  };
}
