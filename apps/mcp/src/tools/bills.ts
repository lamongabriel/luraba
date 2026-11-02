import {
  type Bill,
  type BillOccurrence,
  billsEndpoints,
  budgetsEndpoints,
  creditCardsEndpoints,
  transactionsEndpoints,
} from "@luraba/contracts";
import { z } from "zod";
import { fetchAllPages, PAGE_SIZE } from "../client/fetch-all.js";
import { majorToMinor, majorToMoney, toMoney } from "../format/money.js";
import { monthKey } from "../format/period.js";
import { resolveByName } from "../resolve/match.js";
import { clarificationOutput, Problems } from "../resolve/problems.js";
import { resolveClassification } from "./transactions.js";
import {
  DESTRUCTIVE,
  defineTool,
  IDEMPOTENT_WRITE,
  READ_ONLY,
  type ToolContext,
  type ToolOutput,
  WRITE,
} from "./types.js";

const month = z.string().regex(/^\d{4}-\d{2}$/u, "Use YYYY-MM");

function lastDayOf(key: string): string {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

async function listBills(context: ToolContext, status?: Bill["status"]) {
  return fetchAllPages((page) =>
    context.client.request(billsEndpoints.list, {
      query: { page, perPage: PAGE_SIZE, ...(status ? { status } : {}) },
    }),
  );
}

async function resolveBill(context: ToolContext, problems: Problems, query: string) {
  const bills = await listBills(context);
  const id = problems.take("bill", resolveByName(query, bills));
  return { id, bill: bills.find((item) => item.id === id), bills };
}

/** "upcoming" until a week before the due date, "due" inside that week, then "overdue" once passed. */
function billStatus(occurrence: BillOccurrence, today: string): string {
  if (occurrence.state === "paid") return "paid";
  if (occurrence.state === "skipped") return "skipped";
  if (occurrence.dueDate < today) return "overdue";
  const days = (Date.parse(occurrence.dueDate) - Date.parse(today)) / 86_400_000;
  return days <= 7 ? "due" : "upcoming";
}

function describeBill(bill: Bill, names: Map<string, string>) {
  return {
    id: bill.id,
    name: bill.name,
    estimatedAmount: toMoney(bill.expectedAmount, bill.currencyCode),
    dueDay: bill.dayOfMonth,
    frequency: bill.frequency,
    status: bill.status,
    category: bill.categoryId ? (names.get(bill.categoryId) ?? null) : null,
    startDate: bill.startDate,
    endDate: bill.endDate,
    notes: bill.description,
    nextDueDate: bill.summary.nextDueDate,
    paidCount: bill.summary.paidCount,
    overdueCount: bill.summary.overdueCount,
  };
}

async function categoryNames(context: ToolContext) {
  return new Map((await context.refs.categories()).map((item) => [item.id, item.name]));
}

const billInput = {
  category: z.string().optional().describe('A name or a path like "Housing > Water".'),
  merchant: z.string().optional(),
  estimatedAmount: z.number().positive().describe("The usual amount, in major units."),
  dueDay: z.number().int().min(1).max(31).optional().describe("Day of the month it is due."),
  frequency: z
    .enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"])
    .default("monthly")
    .describe("Custom schedules are not supported; pick the closest."),
  startMonth: month.optional().describe("First month, YYYY-MM. Defaults to the current month."),
  endMonth: month.optional().describe("Last month, YYYY-MM. Omit for an open-ended bill."),
  notes: z.string().max(2000).optional(),
  currency: z.string().length(3).optional(),
  createMissing: z
    .boolean()
    .default(false)
    .describe("Create the category and merchant if missing."),
};

export const createRecurringBill = defineTool({
  name: "create_recurring_bill",
  title: "Create a recurring bill",
  description:
    "Create a bill that repeats (monthly by default) with an estimated amount and a due day. Each period gets a bill occurrence that is NOT a transaction: it does not touch balances or spending until it is paid (see mark_bill_paid). Categories and merchants can be names or paths; with createMissing=true missing ones are created. Bills have no pay-from account of their own: choose the account or card when you pay it. If a name is ambiguous nothing is created and candidates come back as needs_clarification. Use dryRun=true to preview.",
  input: z.object({
    name: z.string().min(1).max(255),
    ...billInput,
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    if (args.frequency !== "weekly" && args.frequency !== "biweekly" && !args.dueDay) {
      return {
        isError: true,
        summary: "dueDay is required for monthly, quarterly and yearly bills.",
        data: { status: "invalid_input", missing: "dueDay" },
      };
    }
    const today = await context.refs.today();
    const startMonth = args.startMonth ?? monthKey(today);
    const currency = (args.currency ?? (await context.refs.defaultCurrency())).toUpperCase();
    const classification = await resolveClassification(
      context,
      problems,
      {
        category: args.category,
        merchant: args.merchant,
        createMissing: args.createMissing,
        categoryType: "expense",
      },
      { dryRun: true },
    );
    if (problems.any) return clarificationOutput(problems);
    const existing = (await listBills(context)).find(
      (bill) => bill.name.toLowerCase() === args.name.toLowerCase() && bill.status === "active",
    );
    if (existing) {
      return {
        isError: true,
        summary: `A bill named "${args.name}" already exists. Use update_recurring_bill to change it.`,
        data: { status: "already_exists", id: existing.id },
      };
    }
    const body = {
      name: args.name,
      expectedAmount: majorToMinor(args.estimatedAmount, currency),
      currencyCode: currency,
      frequency: args.frequency,
      dayOfMonth: args.dueDay ?? null,
      startDate: `${startMonth}-01`,
      endDate: args.endMonth ? lastDayOf(args.endMonth) : null,
      description: args.notes ?? null,
    };
    if (args.dryRun) {
      return {
        summary: "Dry run: nothing was created.",
        data: {
          status: "dry_run",
          wouldCreate: { ...body, category: args.category, merchant: args.merchant },
          wouldAlsoCreate: classification.created,
        },
      };
    }
    const real = await resolveClassification(context, new Problems(), {
      category: args.category,
      merchant: args.merchant,
      createMissing: args.createMissing,
      categoryType: "expense",
    });
    const created = await context.client.request(billsEndpoints.create, {
      body: {
        ...body,
        ...(real.categoryId ? { categoryId: real.categoryId } : {}),
        ...(real.merchantId ? { merchantId: real.merchantId } : {}),
      },
    });
    context.refs.invalidate();
    return {
      summary: `Created bill "${created.name}": ${majorToMoney(args.estimatedAmount, currency).formatted} ${created.frequency}${args.dueDay ? ` on day ${args.dueDay}` : ""}.`,
      data: {
        status: "created",
        bill: describeBill(created, await categoryNames(context)),
        alsoCreated: real.created,
      },
    };
  },
});

export const listRecurringBills = defineTool({
  name: "list_recurring_bills",
  title: "List recurring bills",
  description:
    "The recurring bills with estimated amount, due day, category, next due date and how many occurrences are paid or overdue, plus the total estimated per month.",
  input: z.object({
    status: z.enum(["active", "paused", "canceled"]).default("active"),
  }),
  annotations: READ_ONLY,
  async handler(context, args): Promise<ToolOutput> {
    const bills = await listBills(context, args.status);
    const names = await categoryNames(context);
    const monthly = bills.filter((bill) => bill.frequency === "monthly");
    const currency = bills[0]?.currencyCode ?? (await context.refs.defaultCurrency());
    return {
      summary: `${bills.length} ${args.status} bill(s).`,
      data: {
        bills: bills.map((bill) => describeBill(bill, names)),
        monthlyEstimatedTotal: toMoney(
          monthly.reduce((sum, bill) => sum + bill.expectedAmount, 0),
          currency,
        ),
      },
    };
  },
});

export const updateRecurringBill = defineTool({
  name: "update_recurring_bill",
  title: "Update a recurring bill",
  description:
    "Change a bill by name or id: estimated amount, due day, category, merchant, frequency, end month, notes, or pause/resume/cancel it. Only unpaid occurrences from today on are rebuilt; history is never touched.",
  input: z.object({
    bill: z.string(),
    name: z.string().min(1).max(255).optional(),
    category: z.string().optional(),
    merchant: z.string().optional(),
    estimatedAmount: z.number().positive().optional(),
    dueDay: z.number().int().min(1).max(31).optional(),
    frequency: billInput.frequency.unwrap().optional(),
    endMonth: month.optional(),
    notes: z.string().max(2000).optional(),
    action: z.enum(["pause", "resume", "cancel"]).optional(),
    createMissing: z.boolean().default(false),
    dryRun: z.boolean().default(false),
  }),
  annotations: IDEMPOTENT_WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const { id, bill } = await resolveBill(context, problems, args.bill);
    const classification = await resolveClassification(
      context,
      problems,
      {
        category: args.category,
        merchant: args.merchant,
        createMissing: args.createMissing,
        categoryType: "expense",
      },
      { dryRun: true },
    );
    if (problems.any || !id || !bill) return clarificationOutput(problems);
    const real = args.dryRun
      ? classification
      : await resolveClassification(context, new Problems(), {
          category: args.category,
          merchant: args.merchant,
          createMissing: args.createMissing,
          categoryType: "expense",
        });
    const body = {
      ...(args.name ? { name: args.name } : {}),
      ...(args.estimatedAmount === undefined
        ? {}
        : { expectedAmount: majorToMinor(args.estimatedAmount, bill.currencyCode) }),
      ...(args.dueDay ? { dayOfMonth: args.dueDay } : {}),
      ...(args.frequency ? { frequency: args.frequency } : {}),
      ...(args.endMonth ? { endDate: lastDayOf(args.endMonth) } : {}),
      ...(args.notes === undefined ? {} : { description: args.notes }),
      ...(real.categoryId ? { categoryId: real.categoryId } : {}),
      ...(real.merchantId ? { merchantId: real.merchantId } : {}),
    };
    if (args.dryRun) {
      return {
        summary: "Dry run: nothing was changed.",
        data: {
          status: "dry_run",
          bill: bill.name,
          wouldChange: body,
          action: args.action ?? null,
        },
      };
    }
    if (Object.keys(body).length === 0 && !args.action) {
      return { isError: true, summary: "Nothing to change.", data: { status: "invalid_input" } };
    }
    if (Object.keys(body).length > 0) {
      await context.client.request(billsEndpoints.update, { params: { id }, body });
    }
    if (args.action === "pause")
      await context.client.request(billsEndpoints.pause, { params: { id } });
    if (args.action === "resume")
      await context.client.request(billsEndpoints.resume, { params: { id } });
    if (args.action === "cancel")
      await context.client.request(billsEndpoints.cancel, { params: { id } });
    context.refs.invalidate();
    const updated = await context.client.request(billsEndpoints.get, { params: { id } });
    return {
      summary: `Updated bill "${updated.name}".`,
      data: { status: "updated", bill: describeBill(updated, await categoryNames(context)) },
    };
  },
});

export const deleteRecurringBill = defineTool({
  name: "delete_recurring_bill",
  title: "Delete a recurring bill",
  description:
    "Permanently delete a bill and its occurrences (linked transactions are kept). Requires confirm=true; without it you get the bill to show the user first. Prefer update_recurring_bill with action=cancel to keep the history.",
  input: z.object({ bill: z.string(), confirm: z.boolean().default(false) }),
  annotations: DESTRUCTIVE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const { id, bill } = await resolveBill(context, problems, args.bill);
    if (problems.any || !id || !bill) return clarificationOutput(problems);
    if (!args.confirm) {
      return {
        summary: `Not deleted: confirm=true is required. "${bill.name}" has ${bill.summary.paidCount} paid occurrence(s).`,
        data: { status: "confirmation_required", bill: { id, name: bill.name } },
      };
    }
    await context.client.request(billsEndpoints.delete, { params: { id } });
    return {
      summary: `Deleted bill "${bill.name}".`,
      data: { status: "deleted", bill: { id, name: bill.name } },
    };
  },
});

async function occurrenceFor(
  context: ToolContext,
  billId: string,
  args: { month?: string | undefined; dueDate?: string | undefined },
  today: string,
): Promise<BillOccurrence | undefined> {
  const key = args.month ?? (args.dueDate ? args.dueDate.slice(0, 7) : monthKey(today));
  const rows = await fetchAllPages((page) =>
    context.client.request(billsEndpoints.listOccurrences, {
      params: { id: billId },
      query: { page, perPage: PAGE_SIZE, from: `${key}-01`, to: lastDayOf(key) },
    }),
  );
  return args.dueDate ? rows.find((row) => row.dueDate === args.dueDate) : rows[0];
}

export const markBillPaid = defineTool({
  name: "mark_bill_paid",
  title: "Mark a bill occurrence paid",
  description:
    "Settle one occurrence of a bill (the month given, default the current one). Three ways: pass transactionId to link an existing expense; pass actualAmount with account (or creditCard) to create the expense from the bill (its category and merchant come from the bill, the description is the bill name) and link it; or pass neither to just mark it paid. Returns estimated vs actual. A transaction can pay only one occurrence. Use dryRun=true to preview.",
  input: z.object({
    bill: z.string(),
    month: month
      .optional()
      .describe("Which occurrence, by its due month. Defaults to the current month."),
    dueDate: z.iso.date().optional().describe("Exact due date when a bill has several in a month."),
    transactionId: z.uuid().optional(),
    actualAmount: z
      .number()
      .positive()
      .optional()
      .describe("Creates the expense with this amount."),
    account: z.string().optional(),
    creditCard: z.string().optional(),
    date: z.iso.date().optional().describe("Payment date. Defaults to today."),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const { id, bill } = await resolveBill(context, problems, args.bill);
    const accountId = args.account
      ? problems.take("account", await context.refs.resolveAccount(args.account))
      : undefined;
    const cardId = args.creditCard
      ? problems.take("creditCard", await context.refs.resolveCreditCard(args.creditCard))
      : undefined;
    if (problems.any || !id || !bill) return clarificationOutput(problems);
    const today = await context.refs.today();
    const occurrence = await occurrenceFor(context, id, args, today);
    if (!occurrence) {
      return {
        isError: true,
        summary: `"${bill.name}" has no occurrence in ${args.month ?? monthKey(today)}.`,
        data: { status: "not_found" },
      };
    }
    if (occurrence.state === "paid") {
      return {
        isError: true,
        summary: "That occurrence is already paid.",
        data: { status: "already_paid" },
      };
    }
    const creating = args.actualAmount !== undefined;
    if (creating && !accountId && !cardId) {
      return {
        isError: true,
        summary: "To create the payment give account or creditCard.",
        data: { status: "invalid_input", missing: "account or creditCard" },
      };
    }
    const date = args.date ?? today;
    if (args.dryRun) {
      return {
        summary: "Dry run: nothing was changed.",
        data: {
          status: "dry_run",
          occurrence: {
            dueDate: occurrence.dueDate,
            estimated: toMoney(occurrence.expectedAmount, bill.currencyCode),
          },
          wouldDo: args.transactionId
            ? "link the transaction"
            : creating
              ? "create the expense and link it"
              : "mark it paid",
        },
      };
    }
    let transactionId = args.transactionId;
    if (creating && args.actualAmount !== undefined) {
      const amount = majorToMinor(args.actualAmount, bill.currencyCode);
      if (cardId) {
        const purchase = await context.client.request(creditCardsEndpoints.createPurchase, {
          params: { id: cardId },
          body: {
            description: bill.name,
            amount,
            purchaseDate: date,
            postedDate: date,
            installmentCount: 1,
            includeInBudget: true,
            ...(bill.categoryId ? { categoryId: bill.categoryId } : {}),
            ...(bill.merchantId ? { merchantId: bill.merchantId } : {}),
          },
        });
        transactionId = purchase.transactionId;
      } else if (accountId) {
        const created = await context.client.request(transactionsEndpoints.create, {
          body: {
            type: "expense",
            description: bill.name,
            amount,
            currencyCode: bill.currencyCode,
            accountId,
            paymentMethodCode: "debit_card",
            purchaseDate: date,
            postedDate: date,
            ...(bill.categoryId ? { categoryId: bill.categoryId } : {}),
            ...(bill.merchantId ? { merchantId: bill.merchantId } : {}),
          },
        });
        transactionId = created.id;
      }
    }
    const paid = transactionId
      ? await context.client.request(billsEndpoints.linkOccurrence, {
          params: { id, occurrenceId: occurrence.id },
          body: { transactionId },
        })
      : await context.client.request(billsEndpoints.markOccurrencePaid, {
          params: { id, occurrenceId: occurrence.id },
        });
    context.refs.invalidate();
    const actual = paid.transaction?.amount ?? null;
    return {
      summary: `Marked "${bill.name}" (${paid.dueDate}) paid${actual === null ? "" : ` for ${toMoney(actual, bill.currencyCode).formatted}`}.`,
      data: {
        status: "paid",
        bill: bill.name,
        dueDate: paid.dueDate,
        estimated: toMoney(paid.expectedAmount, bill.currencyCode),
        actual: actual === null ? null : toMoney(actual, bill.currencyCode),
        difference:
          actual === null ? null : toMoney(actual - paid.expectedAmount, bill.currencyCode),
        transactionId: transactionId ?? null,
      },
    };
  },
});

export const reportBills = defineTool({
  name: "report_bills",
  title: "Bills for a month",
  description:
    "Every bill occurrence due in a month (default current): estimated amount, actual (the linked payment), due date and status (upcoming, due within 7 days, paid, overdue, skipped), with totals for estimated, paid so far and still to pay.",
  input: z.object({ month: month.optional() }),
  annotations: READ_ONLY,
  async handler(context, args): Promise<ToolOutput> {
    const today = await context.refs.today();
    const key = args.month ?? monthKey(today);
    const bills = await listBills(context, "active");
    const rows: { name: string; occurrence: BillOccurrence; currency: string }[] = [];
    for (const bill of bills) {
      const occurrences = await fetchAllPages((page) =>
        context.client.request(billsEndpoints.listOccurrences, {
          params: { id: bill.id },
          query: { page, perPage: PAGE_SIZE, from: `${key}-01`, to: lastDayOf(key) },
        }),
      );
      for (const occurrence of occurrences)
        rows.push({ name: bill.name, occurrence, currency: bill.currencyCode });
    }
    rows.sort((a, b) => a.occurrence.dueDate.localeCompare(b.occurrence.dueDate));
    const currency = rows[0]?.currency ?? (await context.refs.defaultCurrency());
    const live = rows.filter((row) => row.occurrence.state !== "skipped");
    const estimated = live.reduce((sum, row) => sum + row.occurrence.expectedAmount, 0);
    const paidRows = live.filter((row) => row.occurrence.state === "paid");
    const actual = paidRows.reduce(
      (sum, row) => sum + (row.occurrence.transaction?.amount ?? 0),
      0,
    );
    const paidEstimate = paidRows.reduce((sum, row) => sum + row.occurrence.expectedAmount, 0);
    return {
      summary: `${rows.length} bill(s) in ${key}: ${toMoney(estimated, currency).formatted} estimated, ${paidRows.length} paid.`,
      data: {
        month: key,
        bills: rows.map(({ name, occurrence }) => ({
          name,
          dueDate: occurrence.dueDate,
          status: billStatus(occurrence, today),
          estimated: toMoney(occurrence.expectedAmount, currency),
          actual: occurrence.transaction ? toMoney(occurrence.transaction.amount, currency) : null,
          transactionId: occurrence.transaction?.id ?? null,
        })),
        totals: {
          estimated: toMoney(estimated, currency),
          actualPaid: toMoney(actual, currency),
          paidVsEstimate: toMoney(actual - paidEstimate, currency),
          stillToPay: toMoney(estimated - paidEstimate, currency),
          paidCount: paidRows.length,
          overdueCount: live.filter((row) => billStatus(row.occurrence, today) === "overdue")
            .length,
        },
      },
    };
  },
});

export const setBudget = defineTool({
  name: "set_budget",
  title: "Set a category budget",
  description:
    'Set the budgeted amount of a category (a name or a path like "Housing > Water") for a month, or for a range of months to make it recurring: pass through (YYYY-MM) to apply it to every month from month to through. Other categories in those months are left as they are. amount is in major units; 0 removes the budget. A parent category\'s budget caps its subcategories (the API rejects totals above it). Compare with report_budget. Use dryRun=true to preview.',
  input: z.object({
    category: z.string(),
    amount: z.number().min(0),
    month: month.optional().describe("Defaults to the current month."),
    through: month.optional().describe("Last month of a recurring range; up to 36 months."),
    dryRun: z.boolean().default(false),
  }),
  annotations: IDEMPOTENT_WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const categoryId = problems.take("category", await context.refs.resolveCategory(args.category));
    if (problems.any || !categoryId) return clarificationOutput(problems);
    const category = (await context.refs.categories()).find((item) => item.id === categoryId);
    const side = category?.type === "income" ? "income" : "expense";
    const first = args.month ?? monthKey(await context.refs.today());
    const last = args.through ?? first;
    const months: string[] = [];
    for (let key = first; key <= last && months.length < 37; key = monthKey(`${key}-01`, 1))
      months.push(key);
    if (months.length > 36 || last < first) {
      return {
        isError: true,
        summary: "through must be on or after month, within 36 months.",
        data: { status: "invalid_input" },
      };
    }
    const results: { month: string; budgeted: string }[] = [];
    for (const key of months) {
      const current = await context.client.request(budgetsEndpoints.getMonth, {
        params: { month: key },
        query: {},
      });
      const keep = (lines: typeof current.categories.expense) =>
        lines
          .filter((line) => line.budgetedAmount > 0 && line.categoryId !== categoryId)
          .map((line) => ({ categoryId: line.categoryId, amount: line.budgetedAmount }));
      const amount = majorToMinor(args.amount, current.budgetCurrencyCode);
      const body = {
        income: keep(current.categories.income),
        expense: keep(current.categories.expense),
      };
      if (amount > 0) body[side].push({ categoryId, amount });
      if (!args.dryRun) {
        await context.client.request(budgetsEndpoints.replaceMonth, {
          params: { month: key },
          body,
        });
      }
      results.push({ month: key, budgeted: toMoney(amount, current.budgetCurrencyCode).formatted });
    }
    return {
      summary: `${args.dryRun ? "Dry run: would set" : "Set"} the "${category?.name}" budget for ${months.length} month(s).`,
      data: { status: args.dryRun ? "dry_run" : "set", category: category?.name, months: results },
    };
  },
});
