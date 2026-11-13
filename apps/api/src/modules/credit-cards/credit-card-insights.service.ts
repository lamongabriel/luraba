import { endOfMonth, parseMonthKey, shiftMonthKey } from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { buildCombinedFx, combineAmounts } from "@/modules/fx/fx-combine.service";
import {
  type InsightInstallmentRow,
  listInstallmentsDueBetween,
} from "./credit-card-insights.repository";
import type { CreditCardInsightsQuery, CreditCardInsightsResponse } from "./credit-cards.types";

type Group = CreditCardInsightsResponse["groups"][number];

const HISTORY_MONTHS = 6;
const UPCOMING_MONTHS = 6;

function sum(rows: InsightInstallmentRow[]) {
  return rows.reduce((total, row) => total + row.amount, 0);
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const id = key(item);
    groups.set(id, [...(groups.get(id) ?? []), item]);
  }
  return groups;
}

/** One currency's insights from the installments around the selected month. Pure, for testing. */
export function buildInsightsGroup(
  currencyCode: string,
  rows: InsightInstallmentRow[],
  month: string,
): Group {
  const current = rows.filter((row) => row.dueMonth === month);
  const previous = rows.filter((row) => row.dueMonth === shiftMonthKey(month, -1));

  const byCategory = [...groupBy(current, (row) => row.categoryId ?? "none").values()]
    .map((items) => ({
      categoryId: items[0]?.categoryId ?? null,
      name: items[0]?.categoryName ?? "Uncategorized",
      color: items[0]?.categoryColor ?? null,
      amount: sum(items),
    }))
    .sort((left, right) => right.amount - left.amount);

  const history = Array.from({ length: HISTORY_MONTHS }, (_, index) => {
    const key = shiftMonthKey(month, index - (HISTORY_MONTHS - 1));
    return { month: key, amount: sum(rows.filter((row) => row.dueMonth === key)) };
  });
  const upcomingInstallments = Array.from({ length: UPCOMING_MONTHS }, (_, index) => {
    const key = shiftMonthKey(month, index + 1);
    return {
      month: key,
      amount: sum(rows.filter((row) => row.dueMonth === key && row.installmentCount > 1)),
    };
  });

  return {
    currencyCode,
    total: sum(current),
    previousTotal: sum(previous),
    byCategory,
    history,
    upcomingInstallments,
  };
}

/**
 * Spending insights for the invoices due in a month, one group per currency in its own
 * currency, plus `combined` totals in the household base currency. Looks six months back and ahead for trends and commitments.
 */
export async function getInsights(
  context: HouseholdContext,
  query: CreditCardInsightsQuery,
): Promise<CreditCardInsightsResponse> {
  const from = parseMonthKey(shiftMonthKey(query.month, -HISTORY_MONTHS));
  const to = endOfMonth(parseMonthKey(shiftMonthKey(query.month, UPCOMING_MONTHS)));
  const rows = await listInstallmentsDueBetween(context.householdId, from, to);
  const currencies = [...new Set(rows.map((row) => row.currencyCode))].sort();

  const groups = currencies.map((currencyCode) =>
    buildInsightsGroup(
      currencyCode,
      rows.filter((row) => row.currencyCode === currencyCode),
      query.month,
    ),
  );
  const fx = await buildCombinedFx(context, currencies);

  return {
    month: query.month,
    groups,
    combined: {
      fx,
      total: combineAmounts(
        fx,
        Object.fromEntries(groups.map((group) => [group.currencyCode, group.total])),
      ),
      previousTotal: combineAmounts(
        fx,
        Object.fromEntries(groups.map((group) => [group.currencyCode, group.previousTotal])),
      ),
    },
  };
}
