import { z } from "zod";
import { currencyCodeSchema } from "../common.js";
import { combinedAmountSchema, combinedFxSchema } from "../fx/resource.js";
import { monthKeySchema } from "../goals/requests.js";

export const safeToSpendQuerySchema = z.object({
  /** The month to answer for; defaults to the current month in the household time zone. */
  month: monthKeySchema.optional(),
});
export type SafeToSpendQuery = z.input<typeof safeToSpendQuerySchema>;

export const safeToSpendBillSchema = z.object({
  occurrenceId: z.uuid(),
  billId: z.uuid(),
  name: z.string(),
  dueDate: z.iso.date(),
  /** Minor units of the bill's currency. */
  amount: z.number().int(),
  /** Due before today and still unpaid. */
  overdue: z.boolean(),
  /** Which horizon it belongs to: due this month (or overdue) or next month. */
  horizon: z.enum(["this_month", "next_month"]),
});

export const safeToSpendInvoiceSchema = z.object({
  cycleId: z.uuid(),
  creditCardId: z.uuid(),
  cardName: z.string(),
  dueDate: z.iso.date(),
  /** What is left to pay on the invoice. */
  remaining: z.number().int(),
  statement: z.number().int(),
  horizon: z.enum(["this_month", "next_month"]),
});

export const safeToSpendGoalSchema = z.object({
  goalId: z.uuid(),
  name: z.string(),
  /** This month's plan, contributed so far, and what is still owed (never negative). */
  planned: z.number().int(),
  contributed: z.number().int(),
  owed: z.number().int(),
  /** Next month's plan. */
  nextPlanned: z.number().int(),
});

export const safeToSpendAccountSchema = z.object({
  accountId: z.uuid(),
  name: z.string(),
  balance: z.number().int(),
  /** Goal money (piggy banks) sitting in this account, not spendable. */
  heldForGoals: z.number().int(),
});

export const safeToSpendCurrencySchema = z.object({
  currencyCode: currencyCodeSchema,
  thisMonth: z.object({
    /** Spendable balance now: the accounts' balance minus the goal money held in them. */
    spendableBalance: z.number().int(),
    accountsBalance: z.number().int(),
    goalFundsHeld: z.number().int(),
    /** Memo, plan currency only: salary of the month received so far and projected (net of taxes). */
    incomeReceived: z.number().int().nullable(),
    incomeProjected: z.number().int().nullable(),
    billsRemaining: z.number().int(),
    goalsOwed: z.number().int(),
    invoicesDue: z.number().int(),
    /** spendableBalance - billsRemaining - goalsOwed - invoicesDue; negative means short. */
    leftToSpend: z.number().int(),
  }),
  nextMonth: z.object({
    /** Projected salary minus taxes from the monthly plan; null when this currency has no plan. */
    projectedIncome: z.number().int().nullable(),
    bills: z.number().int(),
    goals: z.number().int(),
    /** Card charges already on the invoices due next month. */
    cardCharged: z.number().int(),
    commitments: z.number().int(),
    /** projectedIncome - commitments; null when there is no projected income. */
    leftForCard: z.number().int().nullable(),
  }),
  accounts: z.array(safeToSpendAccountSchema),
  bills: z.array(safeToSpendBillSchema),
  invoices: z.array(safeToSpendInvoiceSchema),
  goals: z.array(safeToSpendGoalSchema),
});

export const safeToSpendOverspentBudgetSchema = z.object({
  categoryId: z.uuid(),
  categoryName: z.string(),
  budgeted: z.number().int(),
  actual: z.number().int(),
});

export const safeToSpendSchema = z.object({
  month: z.string(),
  nextMonth: z.string(),
  today: z.iso.date(),
  /** One block per currency, in its own currency. */
  currencies: z.array(safeToSpendCurrencySchema),
  /** The headline figures converted into the household base currency, with the rates used. */
  combined: z.object({
    fx: combinedFxSchema,
    leftToSpend: combinedAmountSchema,
    /** `null` when no currency has a monthly plan for next month. */
    leftForCard: combinedAmountSchema.nullable(),
  }),
  /** Guidance only: budgets do not enter the left-to-spend maths. Amounts are in `budgetCurrencyCode`. */
  budgets: z.object({
    currencyCode: z.string(),
    overspent: z.array(safeToSpendOverspentBudgetSchema),
  }),
});

export type SafeToSpend = z.output<typeof safeToSpendSchema>;
export type SafeToSpendCurrency = z.output<typeof safeToSpendCurrencySchema>;
export type SafeToSpendBill = z.output<typeof safeToSpendBillSchema>;
export type SafeToSpendInvoice = z.output<typeof safeToSpendInvoiceSchema>;
export type SafeToSpendGoal = z.output<typeof safeToSpendGoalSchema>;
