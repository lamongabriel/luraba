import { monthlyPlansEndpoints, type SafeToSpendCurrency } from "@luraba/contracts";
import { z } from "zod";
import { majorToMinor, toMoney } from "../format/money.js";
import { defineTool, READ_ONLY, type ToolOutput } from "./types.js";

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM");

function present(group: SafeToSpendCurrency, purchase: number | undefined, via: string) {
  const c = group.currencyCode;
  const m = (value: number) => toMoney(value, c);
  const t = group.thisMonth;
  const n = group.nextMonth;
  const whatIf =
    purchase === undefined
      ? undefined
      : via === "cash"
        ? {
            via,
            purchase: m(purchase),
            leftToSpendAfter: m(t.leftToSpend - purchase),
            compromises: t.leftToSpend - purchase < 0,
          }
        : {
            via,
            purchase: m(purchase),
            leftForCardAfter: n.leftForCard === null ? null : m(n.leftForCard - purchase),
            compromises: n.leftForCard === null ? null : n.leftForCard - purchase < 0,
          };
  return {
    currency: c,
    thisMonthCash: {
      leftToSpend: m(t.leftToSpend),
      spendableBalance: m(t.spendableBalance),
      goalMoneyHeldAside: m(t.goalFundsHeld),
      unpaidBills: m(t.billsRemaining),
      goalContributionsStillOwed: m(t.goalsOwed),
      cardInvoicesDueUnpaid: m(t.invoicesDue),
      incomeReceivedThisMonth: t.incomeReceived === null ? null : m(t.incomeReceived),
    },
    nextMonthCard: {
      leftForCardSpending: n.leftForCard === null ? null : m(n.leftForCard),
      projectedIncome: n.projectedIncome === null ? null : m(n.projectedIncome),
      commitments: m(n.commitments),
      bills: m(n.bills),
      goalContributions: m(n.goals),
      alreadyChargedToCard: m(n.cardCharged),
    },
    unpaidBills: group.bills.map((bill) => ({
      name: bill.name,
      dueDate: bill.dueDate,
      amount: m(bill.amount),
      overdue: bill.overdue,
      month: bill.horizon,
    })),
    invoices: group.invoices.map((invoice) => ({
      card: invoice.cardName,
      dueDate: invoice.dueDate,
      remaining: m(invoice.remaining),
      month: invoice.horizon,
    })),
    goals: group.goals.map((goal) => ({
      name: goal.name,
      planned: m(goal.planned),
      contributed: m(goal.contributed),
      stillOwed: m(goal.owed),
      nextMonthPlanned: m(goal.nextPlanned),
    })),
    whatIf,
  };
}

export const reportSafeToSpend = defineTool({
  name: "report_safe_to_spend",
  title: "How much can I still spend?",
  description:
    'Answers "how much can I still spend this month, and can I afford this purchase?". Per currency (never mixed): (1) THIS MONTH IN CASH = balance of spendable cash accounts (goal money set aside in piggy banks excluded) minus unpaid bills (including overdue) minus goal contributions still owed (planned minus contributed) minus unpaid card invoices due this month. (2) NEXT MONTH ON THE CARD = projected income from the monthly plan (salary minus taxes) minus bills due next month minus next month\'s goal contributions minus what is already charged on the invoices due next month; null when that currency has no monthly plan. Card purchases are paid next month, so a card purchase counts against (2), a cash/debit purchase against (1). Budgets do not enter the maths; overspent budgets are listed as guidance. Pass `purchaseAmount` (major units) with `via` to see the effect of a purchase. Defaults to the current month.',
  input: z.object({
    month: monthSchema.optional(),
    purchaseAmount: z
      .number()
      .positive()
      .optional()
      .describe("What-if: a purchase, in major units."),
    currency: z
      .string()
      .length(3)
      .optional()
      .describe("Currency of the what-if purchase and the one to report; default: all."),
    via: z.enum(["cash", "card"]).default("card"),
  }),
  annotations: READ_ONLY,
  async handler(context, args): Promise<ToolOutput> {
    const report = await context.client.request(monthlyPlansEndpoints.safeToSpend, {
      query: args.month ? { month: args.month } : {},
    });
    const wanted = args.currency?.toUpperCase();
    const groups = report.currencies.filter((group) => !wanted || group.currencyCode === wanted);
    const purchaseCurrency = wanted ?? (await context.refs.defaultCurrency());
    const budgetCurrency = report.budgets.currencyCode;
    const presented = groups.map((group) =>
      present(
        group,
        args.purchaseAmount !== undefined && group.currencyCode === purchaseCurrency
          ? majorToMinor(args.purchaseAmount, group.currencyCode)
          : undefined,
        args.via,
      ),
    );
    const lead = presented[0];
    return {
      summary: lead
        ? `Left to spend in ${report.month}: ${presented.map((p) => `${p.thisMonthCash.leftToSpend.formatted} cash`).join(", ")}.`
        : `Nothing to report for ${report.month}.`,
      data: {
        month: report.month,
        nextMonth: report.nextMonth,
        currencies: presented,
        overspentBudgets: report.budgets.overspent.map((row) => ({
          category: row.categoryName,
          budgeted: toMoney(row.budgeted, budgetCurrency),
          spent: toMoney(row.actual, budgetCurrency),
        })),
      },
    };
  },
});
