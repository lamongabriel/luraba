import { listAccountsQuerySchema } from "@luraba/contracts/accounts";
import type {
  SafeToSpend,
  SafeToSpendBill,
  SafeToSpendCurrency,
  SafeToSpendGoal,
  SafeToSpendInvoice,
} from "@luraba/contracts/monthly-plans";
import {
  formatISODate,
  formatMonthKey,
  getTodayInTimezone,
  parseMonthKey,
  shiftMonthKey,
} from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import * as accountsService from "@/modules/accounts/accounts.service";
import { billsRepository } from "@/modules/bills/bills.repository";
import { getMonthlyBudget } from "@/modules/budgets/budgets.service";
import { listCyclesThroughMonth } from "@/modules/credit-cards/credit-card-cycles.service";
import * as creditCardsRepository from "@/modules/credit-cards/credit-cards.repository";
import { buildCombinedFx, combineAmounts } from "@/modules/fx/fx-combine.service";
import { getGoalsReport } from "@/modules/goals/goals.service";
import { getMonthlyPlanReport } from "./monthly-plans.service";

/**
 * Cash account subtypes that count as spendable. Savings accounts (piggy banks, "caixinhas"),
 * money market and CDs are where money is set aside, so they are left out. Goal money that sits in
 * a spendable account is subtracted from it.
 */
export const SPENDABLE_ACCOUNT_SUBTYPES = ["checking", "cash", "prepaid", "other"];

const lastDayOf = (key: string) => {
  const start = parseMonthKey(key);
  return formatISODate(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)));
};

type Group = SafeToSpendCurrency;

const emptyGroup = (currencyCode: string): Group => ({
  currencyCode,
  thisMonth: {
    spendableBalance: 0,
    accountsBalance: 0,
    goalFundsHeld: 0,
    incomeReceived: null,
    incomeProjected: null,
    billsRemaining: 0,
    goalsOwed: 0,
    invoicesDue: 0,
    leftToSpend: 0,
  },
  nextMonth: {
    projectedIncome: null,
    bills: 0,
    goals: 0,
    cardCharged: 0,
    commitments: 0,
    leftForCard: null,
  },
  accounts: [],
  bills: [],
  invoices: [],
  goals: [],
});

/**
 * How much can still be spent, per currency in each currency's own units, plus `combined` totals in the
 * household base currency. See the module README for the formulas:
 * - this month, cash: spendable balance - unpaid bills - goal contributions still owed - unpaid card
 *   invoices due;
 * - next month, card: projected income (salary - taxes of the monthly plan) - bills - goal
 *   contributions - what is already charged on the invoices due next month.
 * Budgets are returned as guidance only.
 */
export async function getSafeToSpend(
  context: HouseholdContext,
  query: { month?: string },
): Promise<SafeToSpend> {
  const today = formatISODate(getTodayInTimezone(context.timezone));
  const month = query.month ?? formatMonthKey(getTodayInTimezone(context.timezone));
  const nextMonth = shiftMonthKey(month, 1);
  const thisEnd = lastDayOf(month);
  const nextEnd = lastDayOf(nextMonth);

  const groups = new Map<string, Group>();
  const group = (code: string) => {
    let found = groups.get(code);
    if (!found) {
      found = emptyGroup(code);
      groups.set(code, found);
    }
    return found;
  };

  // Accounts: spendable cash balance, minus the goal money sitting in each account.
  const [accounts, goalsThis, goalsNext, plan] = await Promise.all([
    accountsService.listAccounts(
      context,
      listAccountsQuerySchema.parse({ perPage: 1000, types: "cash" }),
    ),
    getGoalsReport(context, month),
    getGoalsReport(context, nextMonth),
    getMonthlyPlanReport(context, { from: month, to: nextMonth }),
  ]);

  const heldByAccount = new Map<string, number>();
  for (const goal of goalsThis.goals) {
    for (const location of goal.locations) {
      if (!location.accountId) continue;
      heldByAccount.set(
        `${location.accountId}:${goal.currencyCode}`,
        (heldByAccount.get(`${location.accountId}:${goal.currencyCode}`) ?? 0) + location.amount,
      );
    }
  }
  for (const account of accounts.data) {
    if (!SPENDABLE_ACCOUNT_SUBTYPES.includes(account.subtype)) continue;
    const balance = Number(account.balance);
    const target = group(account.currencyCode);
    const held = Math.min(
      Math.max(0, heldByAccount.get(`${account.id}:${account.currencyCode}`) ?? 0),
      Math.max(0, balance),
    );
    target.accounts.push({
      accountId: account.id,
      name: account.name,
      balance,
      heldForGoals: held,
    });
    target.thisMonth.accountsBalance += balance;
    target.thisMonth.goalFundsHeld += held;
  }

  // Goals: owed this month = planned - contributed, next month = next month's plan.
  const nextPlanned = new Map(goalsNext.goals.map((goal) => [goal.goalId, goal.planned]));
  for (const goal of goalsThis.goals) {
    const next = nextPlanned.get(goal.goalId) ?? 0;
    if (goal.planned === 0 && next === 0) continue;
    const owed = Math.max(0, goal.planned - goal.contributed);
    const row: SafeToSpendGoal = {
      goalId: goal.goalId,
      name: goal.name,
      planned: goal.planned,
      contributed: goal.contributed,
      owed,
      nextPlanned: next,
    };
    const target = group(goal.currencyCode);
    target.goals.push(row);
    target.thisMonth.goalsOwed += owed;
    target.nextMonth.goals += next;
  }

  // Bills: unpaid occurrences. Overdue ones are still owed, so they land in this month.
  const bills = await billsRepository.listUpcomingOccurrences(context.householdId, nextEnd, {});
  for (const bill of bills) {
    const dueDate = formatISODate(bill.dueDate);
    const horizon = dueDate <= thisEnd ? "this_month" : "next_month";
    const row: SafeToSpendBill = {
      occurrenceId: bill.occurrenceId,
      billId: bill.billId,
      name: bill.name,
      dueDate,
      amount: bill.expectedAmount,
      overdue: dueDate < today,
      horizon,
    };
    const target = group(bill.currencyCode);
    target.bills.push(row);
    if (horizon === "this_month") target.thisMonth.billsRemaining += bill.expectedAmount;
    else target.nextMonth.bills += bill.expectedAmount;
  }

  // Credit card invoices: unpaid ones due up to the end of this month are cash owed now; what is on
  // the invoices due next month is the card spend that will be billed next month.
  const cards = await creditCardsRepository.listByHouseholdId(context.householdId);
  const nextStart = parseMonthKey(nextMonth);
  for (const card of cards) {
    const cycles = await listCyclesThroughMonth(context, card, nextStart);
    for (const cycle of cycles) {
      const horizon =
        cycle.dueDate <= thisEnd ? "this_month" : cycle.dueDate <= nextEnd ? "next_month" : null;
      if (!horizon || cycle.remainingAmount <= 0) continue;
      const row: SafeToSpendInvoice = {
        cycleId: cycle.id,
        creditCardId: card.id,
        cardName: card.name,
        dueDate: cycle.dueDate,
        remaining: cycle.remainingAmount,
        statement: cycle.statementAmount,
        horizon,
      };
      const target = group(card.currencyCode);
      target.invoices.push(row);
      if (horizon === "this_month") target.thisMonth.invoicesDue += cycle.remainingAmount;
      else target.nextMonth.cardCharged += cycle.remainingAmount;
    }
  }

  // Income comes from the monthly plan, which lives in one currency: salary less taxes.
  const [planThis, planNext] = plan.months;
  const net = (item: typeof planThis, pick: "projected" | "actual") => {
    const salary = item?.lines.find((line) => line.kind === "salary")?.[pick] ?? 0;
    const taxes = item?.lines.find((line) => line.kind === "taxes")?.[pick] ?? 0;
    return salary - taxes;
  };
  if (planNext?.hasPlan)
    group(plan.currencyCode).nextMonth.projectedIncome = net(planNext, "projected");
  if (planThis?.hasPlan) {
    const target = group(plan.currencyCode).thisMonth;
    target.incomeProjected = net(planThis, "projected");
    target.incomeReceived = net(planThis, "actual");
  }

  for (const item of groups.values()) {
    const t = item.thisMonth;
    t.spendableBalance = t.accountsBalance - t.goalFundsHeld;
    t.leftToSpend = t.spendableBalance - t.billsRemaining - t.goalsOwed - t.invoicesDue;
    const n = item.nextMonth;
    n.commitments = n.bills + n.goals + n.cardCharged;
    n.leftForCard = n.projectedIncome === null ? null : n.projectedIncome - n.commitments;
  }

  const budget = await getMonthlyBudget(context, parseMonthKey(month));
  const currencies = [...groups.values()].sort((a, b) =>
    a.currencyCode.localeCompare(b.currencyCode),
  );
  const fx = await buildCombinedFx(
    context,
    currencies.map((item) => item.currencyCode),
  );
  const withCard = currencies.filter((item) => item.nextMonth.leftForCard !== null);
  return {
    month,
    nextMonth,
    today,
    currencies,
    combined: {
      fx,
      leftToSpend: combineAmounts(
        fx,
        Object.fromEntries(
          currencies.map((item) => [item.currencyCode, item.thisMonth.leftToSpend]),
        ),
      ),
      leftForCard:
        withCard.length === 0
          ? null
          : combineAmounts(
              fx,
              Object.fromEntries(
                withCard.map((item) => [item.currencyCode, item.nextMonth.leftForCard ?? 0]),
              ),
            ),
    },
    budgets: {
      currencyCode: budget.displayCurrencyCode,
      overspent: budget.categories.expense
        .filter((row) => row.budgetedAmount > 0 && row.actualAmount > row.budgetedAmount)
        .map((row) => ({
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          budgeted: row.budgetedAmount,
          actual: row.actualAmount,
        })),
    },
  };
}
