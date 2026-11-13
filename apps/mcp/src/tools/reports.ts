import {
  budgetsEndpoints,
  creditCardsEndpoints,
  fxEndpoints,
  goalsEndpoints,
  transactionsEndpoints,
} from "@luraba/contracts";
import { buildBudgetItems } from "@luraba/domain";
import { z } from "zod";
import { fetchAllPages, PAGE_SIZE } from "../client/fetch-all.js";
import { combineWith, presentCombined, presentFx } from "../format/combined.js";
import { toMoney } from "../format/money.js";
import { monthKey, periodInput, periodRange } from "../format/period.js";
import { loadNameMaps, summarizeRow } from "../format/transactions.js";
import { defineTool, READ_ONLY, type ToolContext } from "./types.js";

const SPENDING_TYPES = ["expense", "credit_card_installment", "refund"] as const;

/** Spending is signed: a refund, cancellation, chargeback or cashback is negative spending. */
function spent(row: { originType: string; amount: number }): number {
  return row.originType === "refund" ? -Math.abs(row.amount) : Math.abs(row.amount);
}
const MAX_ROWS = 20_000;

async function spendingRows(
  context: ToolContext,
  dateFrom: string,
  dateTo: string,
  currency?: string,
) {
  const rows = await fetchAllPages((page) =>
    context.client.request(transactionsEndpoints.list, {
      query: {
        page,
        perPage: PAGE_SIZE,
        dateFrom,
        dateTo,
        originTypes: [...SPENDING_TYPES],
        ...(currency ? { currencyCodes: [currency] } : {}),
      },
    }),
  );
  return rows.slice(0, MAX_ROWS);
}

export const reportSpending = defineTool({
  name: "report_spending",
  title: "Spending by category, merchant or tag",
  description:
    "Total spending for a period grouped by category, merchant or tag, largest first, with each group's share. Counts expenses and credit card installments posted in the period, net of refunds, cancellations, chargebacks and cashback (those are negative spending in their category); transfers and card bill payments are excluded. A transaction with several tags counts in each tag. Amounts are in one currency (default: the household currency); other currencies are listed separately.",
  input: z.object({
    groupBy: z.enum(["category", "merchant", "tag"]),
    ...periodInput,
    currency: z.string().length(3).optional(),
    limit: z.number().int().min(1).max(100).default(20),
  }),
  annotations: READ_ONLY,
  async handler(context, args) {
    const today = await context.refs.today();
    const range = periodRange(today, args);
    const currency = (args.currency ?? (await context.refs.defaultCurrency())).toUpperCase();
    const all = await spendingRows(context, range.dateFrom, range.dateTo);
    const rows = all.filter((row) => row.currencyCode === currency);
    const otherCurrencies = [...new Set(all.map((row) => row.currencyCode))].filter(
      (code) => code !== currency,
    );
    const names = await loadNameMaps(context.refs);

    const totals = new Map<string, { name: string; amount: number; count: number }>();
    const add = (key: string, name: string, amount: number) => {
      const entry = totals.get(key) ?? { name, amount: 0, count: 0 };
      entry.amount += amount;
      entry.count += 1;
      totals.set(key, entry);
    };
    for (const row of rows) {
      const amount = spent(row);
      if (args.groupBy === "category")
        add(
          row.categoryId ?? "none",
          row.categoryId ? (names.categories.get(row.categoryId) ?? "Unknown") : "Uncategorized",
          amount,
        );
      else if (args.groupBy === "merchant")
        add(
          row.merchantId ?? "none",
          row.merchantId ? (names.merchants.get(row.merchantId) ?? "Unknown") : "No merchant",
          amount,
        );
      else if (row.tags.length === 0) add("none", "Untagged", amount);
      else for (const tag of row.tags) add(tag.id, tag.name, amount);
    }
    const total = rows.reduce((sum, row) => sum + spent(row), 0);
    const groups = [...totals.values()].sort((a, b) => b.amount - a.amount);
    return {
      summary: `Spent ${toMoney(total, currency).formatted} from ${range.dateFrom} to ${range.dateTo}.`,
      data: {
        period: range,
        groupBy: args.groupBy,
        total: toMoney(total, currency),
        transactionCount: rows.length,
        groups: groups.slice(0, args.limit).map((group) => ({
          name: group.name,
          amount: toMoney(group.amount, currency),
          transactions: group.count,
          sharePercent: total === 0 ? 0 : Math.round((group.amount / total) * 1000) / 10,
        })),
        omittedGroups: Math.max(0, groups.length - args.limit),
        otherCurrenciesPresent: otherCurrencies,
      },
    };
  },
});

export const reportIncomeExpense = defineTool({
  name: "report_income_expense",
  title: "Income vs expenses",
  description:
    "Money in, money out and net for a period, compared with the previous period of the same length, using the API's transaction analytics (one currency, the household default unless given).",
  input: z.object({ ...periodInput, currency: z.string().length(3).optional() }),
  annotations: READ_ONLY,
  async handler(context, args) {
    const today = await context.refs.today();
    const range = periodRange(today, args);
    const analytics = await context.client.request(transactionsEndpoints.analytics, {
      query: {
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        ...(args.currency ? { currencyCodes: [args.currency.toUpperCase()] } : {}),
      },
    });
    const c = analytics.currencyCode;
    const metric = (m: (typeof analytics.metrics)["net"]) => ({
      value: toMoney(m.value, c),
      previous: m.previousValue === null ? null : toMoney(m.previousValue, c),
      changePercent: m.changePercent,
    });
    return {
      summary: `Net ${toMoney(analytics.metrics.net.value, c).formatted} from ${range.dateFrom} to ${range.dateTo}.`,
      data: {
        period: range,
        income: metric(analytics.metrics.moneyIn),
        expenses: metric(analytics.metrics.moneyOut),
        net: metric(analytics.metrics.net),
        topExpenseCategories: analytics.expenseBreakdown.items.slice(0, 10).map((item) => ({
          name: item.name,
          amount: toMoney(item.amount, c),
          sharePercent: item.percentage,
        })),
      },
    };
  },
});

export const reportBalances = defineTool({
  name: "report_balances",
  title: "Account balances and net worth",
  description:
    "Balances of all accounts grouped by account type, and net worth (assets minus liabilities): `combinedNetWorth` is ONE number in the household base currency (other currencies converted at the latest rate, see `fx`; null when a rate is missing) and `netWorth` keeps the per-currency amounts. Use search to answer 'how much do I have in <bank>'.",
  input: z.object({
    search: z.string().optional().describe("Only accounts whose name or bank contains this."),
  }),
  annotations: READ_ONLY,
  async handler(context, { search }) {
    const needle = search?.trim().toLowerCase();
    const accounts = (await context.refs.accounts()).filter(
      (a) =>
        !needle ||
        a.name.toLowerCase().includes(needle) ||
        (a.institutionName ?? "").toLowerCase().includes(needle),
    );
    const byType = new Map<string, Map<string, number>>();
    const net = new Map<string, number>();
    for (const account of accounts) {
      const amounts = byType.get(account.type) ?? new Map<string, number>();
      amounts.set(account.currencyCode, (amounts.get(account.currencyCode) ?? 0) + account.balance);
      byType.set(account.type, amounts);
      const signed =
        account.classification === "asset" ? account.balance : -Math.abs(account.balance);
      net.set(account.currencyCode, (net.get(account.currencyCode) ?? 0) + signed);
    }
    const fx = await context.client.request(fxEndpoints.rates, {
      query: { currencies: [...net.keys()] },
    });
    const combinedNet = combineWith(fx, Object.fromEntries(net));
    return {
      summary: `${accounts.length} account(s) counted.${
        combinedNet.total ? ` Net worth about ${combinedNet.total.formatted}.` : ""
      }`,
      data: {
        combinedNetWorth: combinedNet,
        fx: presentFx(fx),
        accounts: accounts.map((a) => ({
          name: a.name,
          institution: a.institutionName,
          type: a.type,
          balance: toMoney(a.balance, a.currencyCode),
        })),
        byType: [...byType.entries()].map(([type, amounts]) => ({
          type,
          totals: [...amounts.entries()].map(([code, value]) => toMoney(value, code)),
          combined: combineWith(fx, Object.fromEntries(amounts)),
        })),
        netWorth: [...net.entries()].map(([code, value]) => toMoney(value, code)),
        note: "Net worth = asset balances minus liability balances. `combinedNetWorth` converts every currency to the base currency; `netWorth` is per currency.",
      },
    };
  },
});

export const reportCreditCards = defineTool({
  name: "report_credit_cards",
  title: "Credit card status",
  description:
    "How many credit cards there are, and for a month (default current) each card's invoice due that month: amount, paid, still owed, due date and status, plus totals (`combined` is ONE number per figure in the household base currency at the latest rate, see `fx`; `totals` keeps each currency) and the next due dates. Answers 'how much do I owe on my cards this month'.",
  input: z.object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/u)
      .optional()
      .describe("YYYY-MM"),
  }),
  annotations: READ_ONLY,
  async handler(context, { month }) {
    const overview = await context.client.request(creditCardsEndpoints.overview, {
      query: { month: month ?? monthKey(await context.refs.today()) },
    });
    const cards = overview.cards.map((card) => ({
      name: card.name,
      last4: card.last4,
      invoice: card.invoice && {
        status: card.invoice.displayStatus,
        dueDate: card.invoice.dueDate,
        closingDate: card.invoice.closingDate,
        statement: toMoney(card.invoice.statementAmount, card.currencyCode),
        paid: toMoney(card.invoice.paidAmount, card.currencyCode),
        owed: toMoney(card.invoice.remainingAmount, card.currencyCode),
      },
      limit: card.limit.limit === null ? null : toMoney(card.limit.limit, card.currencyCode),
      available:
        card.limit.available === null ? null : toMoney(card.limit.available, card.currencyCode),
    }));
    const upcoming = cards
      .filter((card) => card.invoice && card.invoice.owed.amount > 0)
      .map((card) => ({
        card: card.name,
        dueDate: card.invoice?.dueDate,
        owed: card.invoice?.owed,
      }))
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
    return {
      summary: `${cards.length} credit card(s).`,
      data: {
        month: overview.month,
        cardCount: cards.length,
        cards,
        combined: {
          invoices: presentCombined(overview.combined.invoiceAmount, overview.combined.fx),
          paid: presentCombined(overview.combined.invoicePaidAmount, overview.combined.fx),
          owedThisMonth: presentCombined(
            overview.combined.invoiceRemainingAmount,
            overview.combined.fx,
          ),
          creditLimit: presentCombined(overview.combined.limitTotal, overview.combined.fx),
          availableCredit: presentCombined(overview.combined.limitAvailable, overview.combined.fx),
        },
        fx: presentFx(overview.combined.fx),
        totals: overview.totals.map((t) => ({
          currency: t.currencyCode,
          invoices: toMoney(t.invoiceAmount, t.currencyCode),
          paid: toMoney(t.invoicePaidAmount, t.currencyCode),
          owedThisMonth: toMoney(t.invoiceRemainingAmount, t.currencyCode),
        })),
        nextDueDates: upcoming,
      },
    };
  },
});

export const reportBudget = defineTool({
  name: "report_budget",
  title: "Budget status",
  description:
    "Budgeted vs actual income and expenses for a month (default current), per category. A parent category's actual includes its subcategories (same as the Budgets page) and lists them under subcategories, with ownActual, allocated (sum of subcategory budgets) and unallocated; each subcategory carries its parent. Totals count every transaction once.",
  input: z.object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/u)
      .optional(),
  }),
  annotations: READ_ONLY,
  async handler(context, { month }) {
    const key = month ?? monthKey(await context.refs.today());
    const budget = await context.client.request(budgetsEndpoints.getMonth, {
      params: { month: key },
      query: {},
    });
    const c = budget.budgetCurrencyCode;
    const expense = budget.categories.expense;
    // The same rollup the Budgets page uses: a parent's actual includes its subcategories.
    const items = buildBudgetItems(
      expense,
      expense.map((x) => ({
        id: x.categoryId,
        name: x.categoryName,
        parentId: x.parentId,
        type: "expense",
      })),
    );
    const names = new Map(expense.map((x) => [x.categoryId, x.categoryName]));
    const line = (row: (typeof expense)[number]) => ({
      categoryId: row.categoryId,
      category: row.categoryName,
      parent: row.parentId
        ? { categoryId: row.parentId, name: names.get(row.parentId) ?? null }
        : null,
      budgeted: toMoney(row.budgetedAmount, c),
      actual: toMoney(row.actualAmount, c),
      remaining: toMoney(row.budgetedAmount - row.actualAmount, c),
      overBudget: row.actualAmount > row.budgetedAmount && row.budgetedAmount > 0,
    });
    const lines = items.map((item) => {
      if (!item.group) return line(item.row);
      return {
        ...line(item.row),
        ownActual: toMoney(item.group.directAmount, c),
        allocated: toMoney(item.group.allocated, c),
        unallocated: toMoney(item.row.budgetedAmount - item.group.allocated, c),
        subcategories: item.group.children.map(line),
      };
    });
    return {
      data: {
        month: key,
        totals: {
          incomeBudgeted: toMoney(budget.totals.incomeBudgeted, c),
          incomeActual: toMoney(budget.totals.incomeActual, c),
          expenseBudgeted: toMoney(budget.totals.expenseBudgeted, c),
          expenseActual: toMoney(budget.totals.expenseActual, c),
        },
        expenseCategories: lines,
      },
    };
  },
});

export const reportGoals = defineTool({
  name: "report_goals",
  title: "Goals progress",
  description:
    "Savings and investment goals for a month (default: this month): planned vs contributed this month, total progress (saved, target, percent), whether each goal is on track, and where each goal's money currently sits by account. Contributed is contributions minus withdrawals dated in the month. Use set_monthly_plan / report_monthly_plan for the whole monthly plan.",
  input: z.object({
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .optional()
      .describe("YYYY-MM, default this month."),
  }),
  annotations: READ_ONLY,
  async handler(context, args) {
    const report = await context.client.request(goalsEndpoints.report, {
      query: args.month ? { month: args.month } : {},
    });
    const names = new Map((await context.refs.accounts()).map((a) => [a.id, a.name]));
    return {
      summary: `${report.goals.length} goal(s) for ${report.month}.`,
      data: {
        month: report.month,
        goals: report.goals.map((goal) => {
          const c = goal.currencyCode;
          return {
            name: goal.name,
            type: goal.kind,
            state: goal.state,
            plannedThisMonth: toMoney(goal.planned, c),
            contributedThisMonth: toMoney(goal.contributed, c),
            behindThisMonth: goal.contributed < goal.planned,
            totalProgress: toMoney(goal.saved, c),
            target: toMoney(goal.targetAmount, c),
            percent: goal.percent,
            onTrack: goal.onTrack,
            whereTheMoneySits: goal.locations.map((location) => ({
              account: location.accountId
                ? (names.get(location.accountId) ?? "Unknown")
                : "Not assigned",
              amount: toMoney(location.amount, c),
            })),
          };
        }),
      },
    };
  },
});

export const reportTopExpenses = defineTool({
  name: "report_top_expenses",
  title: "Top expenses",
  description:
    "The largest individual expenses (including credit card installments) in a period. Refunds and cashback are not listed here; they reduce the category totals in report_spending.",
  input: z.object({
    ...periodInput,
    limit: z.number().int().min(1).max(50).default(10),
  }),
  annotations: READ_ONLY,
  async handler(context, args) {
    const range = periodRange(await context.refs.today(), args);
    const result = await context.client.request(transactionsEndpoints.list, {
      query: {
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        originTypes: ["expense", "credit_card_installment"],
        sort: "amount",
        sortDirection: "desc",
        page: 1,
        perPage: args.limit,
      },
    });
    const names = await loadNameMaps(context.refs);
    return {
      data: { period: range, expenses: result.data.map((row) => summarizeRow(row, names)) },
    };
  },
});
