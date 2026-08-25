import {
  endOfMonth,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';
import { eq } from 'drizzle-orm';
import type { HouseholdContext } from '@/config/permissions';
import { db } from '@/db';
import { householdsTable } from '@/db/schemas/households.schema';
import { authRepository } from '@/modules/auth/auth.repository';
import { fxService } from '@/modules/fx/fx.service';
import { ListTransactionsRequestQuerySchema } from '@/modules/transactions/transactions.query';
import { listTransactions } from '@/modules/transactions/transactions.service';
import { NotFoundError } from '@/shared/errors';
import { formatISODate, getTodayInTimezone, parseISODate } from '@/shared/lib/date';
import * as repository from './networth.repository';
import type { NetWorthQuery } from './networth.types';

type DateRange = { dateFrom: string; dateTo: string };

function rangeForPeriod(period: string, timezone: string): DateRange {
  const today = getTodayInTimezone(timezone);
  const format = (date: Date) => formatISODate(date);
  switch (period) {
    case 'last_day':
      return { dateFrom: format(today), dateTo: format(today) };
    case 'current_week':
      return { dateFrom: format(startOfWeek(today, { weekStartsOn: 1 })), dateTo: format(today) };
    case 'last_7_days':
      return { dateFrom: format(subDays(today, 6)), dateTo: format(today) };
    case 'last_month': {
      const month = subMonths(today, 1);
      return { dateFrom: format(startOfMonth(month)), dateTo: format(endOfMonth(month)) };
    }
    case 'last_30_days':
      return { dateFrom: format(subDays(today, 29)), dateTo: format(today) };
    case 'last_90_days':
      return { dateFrom: format(subDays(today, 89)), dateTo: format(today) };
    case 'current_year':
      return { dateFrom: format(startOfYear(today)), dateTo: format(today) };
    case 'last_365_days':
      return { dateFrom: format(subDays(today, 364)), dateTo: format(today) };
    case 'last_5_years':
      return { dateFrom: format(startOfYear(subYears(today, 4))), dateTo: format(today) };
    case 'last_10_years':
      return { dateFrom: format(startOfYear(subYears(today, 9))), dateTo: format(today) };
    case 'all_time':
      return { dateFrom: '2000-01-01', dateTo: format(today) };
    default:
      return { dateFrom: format(startOfMonth(today)), dateTo: format(today) };
  }
}

async function resolveQuery(
  context: HouseholdContext,
  query: NetWorthQuery,
): Promise<NetWorthQuery & DateRange & { displayCurrencyCode: string }> {
  const preferences = await authRepository.getUserPreferences(context.userId);
  const today = getTodayInTimezone(context.timezone);
  const todayString = formatISODate(today);
  const range =
    query.dateFrom || query.dateTo
      ? {
          dateFrom: query.dateFrom ?? '2000-01-01',
          dateTo: query.dateTo ?? todayString,
        }
      : rangeForPeriod(preferences?.preferredPeriod ?? 'current_month', context.timezone);
  const household = await db
    .select({ currencyCode: householdsTable.defaultCurrencyId })
    .from(householdsTable)
    .where(eq(householdsTable.id, context.householdId));
  const defaultCurrency = household.find((item) => item)?.currencyCode;
  if (!defaultCurrency) throw new NotFoundError('Household');
  return { ...query, ...range, displayCurrencyCode: query.displayCurrencyCode ?? defaultCurrency };
}

async function convert(
  amount: number,
  currencyCode: string,
  target: string,
  date: Date,
): Promise<number> {
  if (currencyCode === target) return amount;
  try {
    return await fxService.convertAmount({
      amount,
      fromCurrencyCode: currencyCode,
      toCurrencyCode: target,
      date,
    });
  } catch {
    return amount;
  }
}

async function convertRows<T extends { amount: number; currencyCode: string }>(
  rows: T[],
  target: string,
  date: Date,
): Promise<Array<T & { amount: number }>> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      amount: await convert(row.amount, row.currencyCode, target, date),
    })),
  );
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function chooseGranularity(
  dateFrom: string,
  dateTo: string,
  requested?: NetWorthQuery['granularity'],
): 'day' | 'week' | 'month' {
  if (requested) return requested;
  const days = Math.round(
    (parseISODate(dateTo).getTime() - parseISODate(dateFrom).getTime()) / 86_400_000,
  );
  return days <= 45 ? 'day' : days <= 240 ? 'week' : 'month';
}

function stepFor(granularity: 'day' | 'week' | 'month'): string {
  return granularity === 'day' ? '1 day' : granularity === 'week' ? '7 days' : '1 month';
}

export async function getSummary(context: HouseholdContext, input: NetWorthQuery) {
  const query = await resolveQuery(context, input);
  const rows = await repository.listAccountBalances(context.householdId);
  const converted = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      balance: await convert(
        row.balance,
        row.currencyCode,
        query.displayCurrencyCode,
        parseISODate(query.dateTo),
      ),
    })),
  );
  const assets = sum(
    converted.filter((row) => row.classification === 'asset').map((row) => row.balance),
  );
  const liabilities = sum(
    converted.filter((row) => row.classification === 'liability').map((row) => row.balance),
  );
  const flow = await repository.listCashFlow(context.householdId, query.dateFrom, query.dateTo);
  const flowConverted = await convertRows(
    flow,
    query.displayCurrencyCode,
    parseISODate(query.dateTo),
  );
  const income = sum(flowConverted.filter((row) => row.type === 'income').map((row) => row.amount));
  const expenses = sum(
    flowConverted.filter((row) => row.type === 'expense').map((row) => row.amount),
  );
  const transferCount = await repository.countTransfers(
    context.householdId,
    query.dateFrom,
    query.dateTo,
  );
  return {
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    displayCurrencyCode: query.displayCurrencyCode,
    totalBalance: { amount: assets - liabilities, currencyCode: query.displayCurrencyCode },
    assets: { amount: assets, currencyCode: query.displayCurrencyCode },
    liabilities: { amount: liabilities, currencyCode: query.displayCurrencyCode },
    netWorth: { amount: assets - liabilities, currencyCode: query.displayCurrencyCode },
    income: { amount: income, currencyCode: query.displayCurrencyCode },
    expenses: { amount: expenses, currencyCode: query.displayCurrencyCode },
    transferCount,
  };
}

export async function getHistory(context: HouseholdContext, input: NetWorthQuery) {
  const query = await resolveQuery(context, input);
  const granularity = chooseGranularity(query.dateFrom, query.dateTo, query.granularity);
  const rows = await repository.listNetWorthHistory(
    context.householdId,
    query.dateFrom,
    query.dateTo,
    stepFor(granularity),
  );
  const grouped = new Map<string, { assets: number; liabilities: number }>();
  for (const row of rows) {
    const item = grouped.get(row.date) ?? { assets: 0, liabilities: 0 };
    const amount = await convert(
      row.classification === 'asset' ? row.balance : -row.balance,
      row.currencyCode,
      query.displayCurrencyCode,
      parseISODate(row.date),
    );
    if (row.classification === 'asset') item.assets += amount;
    else item.liabilities += amount;
    grouped.set(row.date, item);
  }
  return {
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    displayCurrencyCode: query.displayCurrencyCode,
    granularity,
    points: Array.from(grouped, ([date, value]) => ({
      date,
      netWorth: value.assets - value.liabilities,
    })),
  };
}

export async function getAccounts(context: HouseholdContext, input: NetWorthQuery) {
  const query = await resolveQuery(context, input);
  const rows = await repository.listAccountBalances(context.householdId);
  const converted = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      balance: await convert(
        row.balance,
        row.currencyCode,
        query.displayCurrencyCode,
        parseISODate(query.dateTo),
      ),
    })),
  );
  return {
    displayCurrencyCode: query.displayCurrencyCode,
    assets: converted
      .filter((row) => row.classification === 'asset')
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 3)
      .map(({ classification: _classification, ...row }) => row),
    liabilities: converted
      .filter((row) => row.classification === 'liability')
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 3)
      .map(({ classification: _classification, ...row }) => row),
  };
}

export async function getCashFlow(context: HouseholdContext, input: NetWorthQuery) {
  const query = await resolveQuery(context, input);
  const granularity = chooseGranularity(query.dateFrom, query.dateTo, query.granularity);
  const rows = await convertRows(
    await repository.listCashFlow(context.householdId, query.dateFrom, query.dateTo),
    query.displayCurrencyCode,
    parseISODate(query.dateTo),
  );
  const points = new Map<string, { income: number; expenses: number }>();
  for (const row of rows) {
    const date = row.date.slice(0, granularity === 'month' ? 7 : 10);
    const point = points.get(date) ?? { income: 0, expenses: 0 };
    point[row.type === 'income' ? 'income' : 'expenses'] += row.amount;
    points.set(date, point);
  }
  return {
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    displayCurrencyCode: query.displayCurrencyCode,
    granularity,
    points: Array.from(points, ([date, value]) => ({ date, ...value })),
  };
}

async function breakdown(
  context: HouseholdContext,
  input: NetWorthQuery,
  type: 'expense' | 'income',
) {
  const query = await resolveQuery(context, input);
  const rows =
    type === 'expense'
      ? await repository.listCategoryBreakdown(
          context.householdId,
          query.dateFrom,
          query.dateTo,
          type,
        )
      : await repository.listIncomeSources(context.householdId, query.dateFrom, query.dateTo);
  const converted = await convertRows(rows, query.displayCurrencyCode, parseISODate(query.dateTo));
  const top = converted.slice(0, 5);
  const remainder = sum(converted.slice(5).map((row) => row.amount));
  const total = sum(converted.map((row) => row.amount));
  const items =
    remainder > 0
      ? [
          ...top,
          { id: null, name: 'Other', amount: remainder, currencyCode: query.displayCurrencyCode },
        ]
      : top;
  return {
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    displayCurrencyCode: query.displayCurrencyCode,
    items: items.map(({ currencyCode: _currencyCode, ...item }) => ({
      ...item,
      percentage: total ? Number(((item.amount / total) * 100).toFixed(2)) : 0,
    })),
  };
}

export const getSpendingBreakdown = (context: HouseholdContext, input: NetWorthQuery) =>
  breakdown(context, input, 'expense');
export const getIncomeBreakdown = (context: HouseholdContext, input: NetWorthQuery) =>
  breakdown(context, input, 'income');

export async function getRecentActivity(context: HouseholdContext, input: NetWorthQuery) {
  const query = await resolveQuery(context, input);
  const parsed = ListTransactionsRequestQuerySchema.parse({
    page: 1,
    perPage: query.limit,
    search: '',
    sort: 'postedDate',
    sortDirection: 'desc',
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  });
  const result = await listTransactions(context, parsed);
  return { rows: result.data };
}

export async function getCreditCards(context: HouseholdContext, input: NetWorthQuery) {
  const query = await resolveQuery(context, input);
  const cards = await repository.listCreditCardBalances(context.householdId);
  const converted = await Promise.all(
    cards.map(async (card) => ({
      ...card,
      balance: await convert(
        card.balance,
        card.currencyCode,
        query.displayCurrencyCode,
        parseISODate(query.dateTo),
      ),
      creditLimitAmount: await convert(
        card.creditLimitAmount,
        card.currencyCode,
        query.displayCurrencyCode,
        parseISODate(query.dateTo),
      ),
    })),
  );
  return {
    displayCurrencyCode: query.displayCurrencyCode,
    cards: converted.slice(0, query.limit).map((card) => ({
      ...card,
      remainingAmount: Math.max(0, card.creditLimitAmount - card.balance),
      utilizationPercentage:
        card.creditLimitAmount > 0
          ? Number(((card.balance / card.creditLimitAmount) * 100).toFixed(2))
          : 0,
    })),
  };
}
