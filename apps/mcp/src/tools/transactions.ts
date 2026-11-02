import {
  type CreateTransactionInput,
  categoriesEndpoints,
  creditCardsEndpoints,
  merchantsEndpoints,
  type Transaction,
  tagsEndpoints,
  transactionsEndpoints,
  type UpdateTransactionInput,
} from "@luraba/contracts";
import { z } from "zod";
import { LurabaApiError } from "../client/errors.js";
import { majorToMinor, majorToMoney, toMoney } from "../format/money.js";
import { loadNameMaps, summarizeRow, type TransactionSummary } from "../format/transactions.js";
import { normalize } from "../resolve/match.js";
import { clarificationOutput, Problems } from "../resolve/problems.js";
import {
  buildTransactionQuery,
  loadMatching,
  transactionFilterSchema,
} from "./transaction-filters.js";
import {
  DESTRUCTIVE,
  defineTool,
  READ_ONLY,
  type ToolContext,
  type ToolOutput,
  WRITE,
} from "./types.js";

const MAX_PER_PAGE = 100;

export const searchTransactions = defineTool({
  name: "search_transactions",
  title: "Search transactions",
  description:
    "List transactions with filters (date range, accounts, credit cards, categories, merchants, tags, types, amount range, text). Names are resolved for you; if a name is ambiguous the candidates are returned instead of guessing. Amounts are in major units (12.5 = $12.50): negative for money out, positive for money in. Credit card purchases show as credit_card_installment rows. Returns one page plus totals for everything that matched.",
  input: transactionFilterSchema.extend({
    sortBy: z
      .enum(["purchaseDate", "postedDate", "amount", "description", "createdAt"])
      .default("purchaseDate"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
    page: z.number().int().min(1).default(1),
    perPage: z.number().int().min(1).max(MAX_PER_PAGE).default(25),
  }),
  annotations: READ_ONLY,
  async handler(context, args) {
    const { page, perPage, sortBy, sortDirection, ...filter } = args;
    const { query, problems } = await buildTransactionQuery(context, filter, {
      page,
      perPage,
      sort: sortBy,
      sortDirection,
    });
    if (problems.any) return clarificationOutput(problems);

    const result = await context.client.request(transactionsEndpoints.list, { query });
    const names = await loadNameMaps(context.refs);
    const currency = result.data[0]?.currencyCode ?? (await context.refs.defaultCurrency());
    const summary = result.meta.summary;
    return {
      summary: `${result.meta.pagination.totalCount} transactions match (showing ${result.data.length}).`,
      data: {
        transactions: result.data.map((row) => summarizeRow(row, names)),
        page: result.meta.pagination.page,
        perPage: result.meta.pagination.perPage,
        totalCount: result.meta.pagination.totalCount,
        totalPages: result.meta.pagination.totalPages,
        totals: summary
          ? {
              income: toMoney(summary.incomeAmount, currency),
              expenses: toMoney(summary.expenseAmount, currency),
              transfers: summary.transferCount,
              note: "Totals cover every match, not just this page; they are in the currency of the matching rows.",
            }
          : undefined,
      },
    };
  },
});

export const getTransaction = defineTool({
  name: "get_transaction",
  title: "Get a transaction",
  description: "Read one transaction by id, with its items (what was bought) when it has any.",
  input: z.object({ id: z.uuid() }),
  annotations: READ_ONLY,
  async handler(context, { id }) {
    const [transaction, items, names] = await Promise.all([
      context.client.request(transactionsEndpoints.get, { params: { id } }),
      context.client.request(transactionsEndpoints.listItems, { params: { id } }),
      loadNameMaps(context.refs),
    ]);
    return {
      data: {
        transaction: summarizeRow(transaction, names),
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: toMoney(item.unitPrice, transaction.currencyCode),
        })),
      },
    };
  },
});

/** Resolves the category / merchant / tags a tool call names; creates missing ones on request. */
export async function resolveClassification(
  context: ToolContext,
  problems: Problems,
  input: {
    category?: string | undefined;
    merchant?: string | undefined;
    tags?: string[] | undefined;
    createMissing?: boolean | undefined;
    categoryType?: "expense" | "income" | undefined;
  },
  options: { dryRun?: boolean } = {},
): Promise<{
  categoryId?: string;
  merchantId?: string;
  tagIds?: string[];
  created: { kind: string; name: string }[];
}> {
  const { refs } = context;
  const created: { kind: string; name: string }[] = [];
  const out: { categoryId?: string; merchantId?: string; tagIds?: string[] } = {};

  if (input.category) {
    const segments = input.category
      .split(/\s*(?:>|\/)\s*/u)
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (segments.length > 1) {
      // "Shopping > Electronics": walk the path, creating missing levels when allowed.
      let parentId: string | undefined;
      for (const [index, segment] of segments.entries()) {
        const all = await refs.categories();
        const siblings = all.filter(
          (category) =>
            (category.parentId ?? undefined) === parentId &&
            normalize(category.name) === normalize(segment),
        );
        const last = index === segments.length - 1;
        if (siblings.length === 1 && siblings[0]) {
          parentId = siblings[0].id;
          if (last) out.categoryId = parentId;
        } else if (siblings.length > 1) {
          problems.take("category", {
            status: "ambiguous",
            query: input.category,
            candidates: siblings.map((item) => ({ id: item.id, name: item.name })),
          });
          break;
        } else if (input.createMissing) {
          created.push({ kind: "category", name: segments.slice(0, index + 1).join(" > ") });
          if (options.dryRun) break;
          const category = await context.client.request(categoriesEndpoints.create, {
            body: {
              name: segment,
              type: input.categoryType ?? "expense",
              ...(parentId ? { parentId } : {}),
            },
          });
          refs.invalidate("categories");
          parentId = category.id;
          if (last) out.categoryId = category.id;
        } else {
          problems.take("category", {
            status: "not_found",
            query: input.category,
            suggestions: all
              .filter((category) => normalize(category.name) === normalize(segment))
              .map((item) => ({ id: item.id, name: item.name })),
          });
          break;
        }
      }
    } else {
      const resolution = await refs.resolveCategory(input.category);
      if (resolution.status === "not_found" && input.createMissing) {
        created.push({ kind: "category", name: input.category });
        if (!options.dryRun) {
          const category = await context.client.request(categoriesEndpoints.create, {
            body: { name: input.category, type: input.categoryType ?? "expense" },
          });
          refs.invalidate("categories");
          out.categoryId = category.id;
        }
      } else {
        out.categoryId = problems.take("category", resolution);
      }
    }
  }
  if (input.merchant) {
    const resolution = await refs.resolveMerchant(input.merchant);
    if (resolution.status === "not_found" && input.createMissing) {
      created.push({ kind: "merchant", name: input.merchant });
      if (!options.dryRun) {
        const merchant = await context.client.request(merchantsEndpoints.create, {
          body: { name: input.merchant },
        });
        refs.invalidate("merchants");
        out.merchantId = merchant.id;
      }
    } else {
      out.merchantId = problems.take("merchant", resolution);
    }
  }
  if (input.tags && input.tags.length > 0) {
    const tagIds: string[] = [];
    for (const name of input.tags) {
      const resolution = await refs.resolveTag(name);
      if (resolution.status === "not_found" && input.createMissing) {
        created.push({ kind: "tag", name });
        if (!options.dryRun) {
          const tag = await context.client.request(tagsEndpoints.create, { body: { name } });
          refs.invalidate("tags");
          tagIds.push(tag.id);
        }
      } else {
        const id = problems.take("tags", resolution);
        if (id) tagIds.push(id);
      }
    }
    out.tagIds = tagIds;
  }
  return { ...out, created };
}

const DEFAULT_PAYMENT_METHOD = { expense: "debit_card", income: "wire" } as const;

async function resolvePaymentMethodCode(
  context: ToolContext,
  problems: Problems,
  query: string | undefined,
  kind: "expense" | "income",
): Promise<string | undefined> {
  const methods = await context.refs.paymentMethods();
  if (!query) {
    const fallback =
      methods.find((method) => method.code === DEFAULT_PAYMENT_METHOD[kind]) ?? methods[0];
    return fallback?.code;
  }
  const needle = query.trim().toLowerCase();
  const found = methods.find(
    (method) => method.code === needle || method.name.toLowerCase() === needle,
  );
  if (found) return found.code;
  problems.items.push({
    field: "paymentMethod",
    query,
    reason: "not_found",
    candidates: methods.slice(0, 12).map((method) => ({ id: method.code, name: method.name })),
    hint: "Use one of the payment method codes (the candidate ids).",
  });
  return undefined;
}

const createInput = z.object({
  kind: z.enum(["expense", "income", "transfer", "credit_card_purchase"]),
  description: z.string().min(1).max(512),
  amount: z.number().positive().describe("Positive amount in major units."),
  currency: z.string().length(3).optional().describe("Defaults to the account/card currency."),
  date: z.iso.date().optional().describe("Purchase date, YYYY-MM-DD. Defaults to today."),
  postedDate: z.iso.date().optional().describe("Posted date. Defaults to the date."),
  account: z.string().optional().describe("Expense/income: the account name or id."),
  fromAccount: z.string().optional().describe("Transfer: the source account."),
  toAccount: z.string().optional().describe("Transfer: the destination account."),
  toAmount: z
    .number()
    .positive()
    .optional()
    .describe("Transfer between currencies: the amount received, in the destination currency."),
  creditCard: z.string().optional().describe("Credit card purchase: the card name, last 4 or id."),
  installments: z.number().int().min(1).max(60).default(1).describe("Credit card purchase only."),
  paymentMethod: z.string().optional().describe("Payment method code or name (expense/income)."),
  category: z.string().optional(),
  merchant: z.string().optional(),
  tags: z.array(z.string().min(1)).max(50).optional(),
  includeInBudget: z.boolean().optional(),
  competencyMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional()
    .describe(
      "Expense/income: the month (YYYY-MM) the money belongs to for the monthly plan, when it differs from the posted month. Salary in the Salary & Contracts category received on or after the 16th already counts for the next month without this.",
    ),
  createMissing: z
    .boolean()
    .default(false)
    .describe("Create the category, merchant and tags that do not exist yet."),
  dryRun: z.boolean().default(false),
});
type CreateArgs = z.output<typeof createInput>;

export const createTransaction = defineTool({
  name: "create_transaction",
  title: "Create a transaction",
  description:
    'Create an expense, income, transfer or credit card purchase (with installments). Accounts, credit cards, categories (a path like "Shopping > Electronics" picks or, with createMissing, creates the child under its parent), merchants, tags and payment methods can be given by name or id (details extracted from a screenshot or receipt work well). If a name is ambiguous or unknown nothing is created and the candidates come back as status "needs_clarification"; ask the user, or set createMissing=true to create the missing category/merchant/tags. amount is positive, in major units (12.50 = $12.50). date defaults to today in the household time zone. For the monthly plan, income and expenses belong to a competency month (competencyMonth, YYYY-MM): salary received on or after the 16th counts for the next month by default; set it when a payment belongs to another month. To put money toward a goal use contribute_to_goal, not a plain transfer. Use dryRun=true to preview the resolved transaction without creating it.',
  input: createInput,
  annotations: WRITE,
  async handler(context, args) {
    const problems = new Problems();
    const { refs } = context;
    const date = args.date ?? (await refs.today());
    const postedDate = args.postedDate ?? date;
    const categoryType = args.kind === "income" ? "income" : "expense";
    const missing = (field: string): ToolOutput => ({
      isError: true,
      summary: `${field} is required for kind=${args.kind}.`,
      data: { status: "invalid_input", missing: field },
    });

    let body: CreateTransactionInput | undefined;
    let cardId: string | undefined;
    let currency = args.currency?.toUpperCase();

    if (args.kind === "expense" || args.kind === "income") {
      if (!args.account) return missing("account");
      const accountId = problems.take("account", await refs.resolveAccount(args.account));
      const account = (await refs.accounts()).find((item) => item.id === accountId);
      currency ??= account?.currencyCode;
      const classification = await resolveClassification(
        context,
        problems,
        { ...args, categoryType },
        { dryRun: true },
      );
      const paymentMethodCode = await resolvePaymentMethodCode(
        context,
        problems,
        args.paymentMethod,
        args.kind,
      );
      if (problems.any) return clarificationOutput(problems);
      if (!accountId || !currency || !paymentMethodCode) return missing("account");
      body = {
        type: args.kind,
        description: args.description,
        purchaseDate: date,
        postedDate,
        amount: majorToMinor(args.amount, currency),
        currencyCode: currency,
        accountId,
        paymentMethodCode,
        ...(args.includeInBudget === undefined ? {} : { includeInBudget: args.includeInBudget }),
        ...(args.competencyMonth ? { competencyMonth: args.competencyMonth } : {}),
        ...(classification.categoryId ? { categoryId: classification.categoryId } : {}),
        ...(classification.merchantId ? { merchantId: classification.merchantId } : {}),
        ...(classification.tagIds ? { tagIds: classification.tagIds } : {}),
      };
    } else if (args.kind === "transfer") {
      if (!args.fromAccount) return missing("fromAccount");
      if (!args.toAccount) return missing("toAccount");
      const fromId = problems.take("fromAccount", await refs.resolveAccount(args.fromAccount));
      const toId = problems.take("toAccount", await refs.resolveAccount(args.toAccount));
      if (problems.any) return clarificationOutput(problems);
      const accounts = await refs.accounts();
      const fromCurrency = accounts.find((item) => item.id === fromId)?.currencyCode ?? "USD";
      const toCurrency = accounts.find((item) => item.id === toId)?.currencyCode ?? fromCurrency;
      if (!fromId || !toId) return missing("fromAccount");
      currency = fromCurrency;
      body = {
        type: "transfer",
        description: args.description,
        purchaseDate: date,
        postedDate,
        fromAccountId: fromId,
        toAccountId: toId,
        fromAmount: majorToMinor(args.amount, fromCurrency),
        ...(args.toAmount === undefined
          ? {}
          : { toAmount: majorToMinor(args.toAmount, toCurrency) }),
      };
    } else {
      if (!args.creditCard) return missing("creditCard");
      cardId = problems.take("creditCard", await refs.resolveCreditCard(args.creditCard));
      const card = (await refs.creditCards()).find((item) => item.id === cardId);
      currency = card?.currencyCode ?? currency;
      const classification = await resolveClassification(
        context,
        problems,
        { ...args, categoryType: "expense" },
        { dryRun: true },
      );
      if (problems.any) return clarificationOutput(problems);
      if (!cardId || !currency) return missing("creditCard");
      const purchase = {
        description: args.description,
        amount: majorToMinor(args.amount, currency),
        purchaseDate: date,
        postedDate,
        installmentCount: args.installments,
        includeInBudget: args.includeInBudget ?? true,
        ...(classification.categoryId ? { categoryId: classification.categoryId } : {}),
        ...(classification.merchantId ? { merchantId: classification.merchantId } : {}),
        ...(classification.tagIds ? { tagIds: classification.tagIds } : {}),
      };
      return createCardPurchase(context, args, cardId, currency, purchase);
    }

    if (args.dryRun) {
      return {
        summary: "Dry run: nothing was created.",
        data: {
          status: "dry_run",
          wouldCreate: {
            ...(body ?? {}),
            amountDisplay: majorToMoney(args.amount, currency ?? "USD"),
          },
          wouldAlsoCreate: args.createMissing
            ? (
                await resolveClassification(
                  context,
                  new Problems(),
                  { ...args, categoryType },
                  { dryRun: true },
                )
              ).created
            : [],
        },
      };
    }

    // Everything resolved: now create what was missing, then the transaction itself.
    const classification = await resolveClassification(context, new Problems(), {
      ...args,
      categoryType,
    });
    if (!body) return missing("account");
    const finalBody = (
      body.type === "expense" || body.type === "income"
        ? {
            ...body,
            ...(classification.categoryId ? { categoryId: classification.categoryId } : {}),
            ...(classification.merchantId ? { merchantId: classification.merchantId } : {}),
            ...(classification.tagIds ? { tagIds: classification.tagIds } : {}),
          }
        : body
    ) as CreateTransactionInput;
    const created = await context.client.request(transactionsEndpoints.create, {
      body: finalBody,
    });
    const names = await loadNameMaps(context.refs);
    return {
      summary: `Created ${args.kind} "${created.description}" for ${majorToMoney(args.amount, created.currencyCode).formatted}.`,
      data: {
        status: "created",
        transaction: summarizeRow(created, names),
        alsoCreated: classification.created,
      },
    };
  },
});

async function createCardPurchase(
  context: ToolContext,
  args: CreateArgs,
  cardId: string,
  currency: string,
  purchase: {
    description: string;
    amount: number;
    purchaseDate: string;
    postedDate: string;
    installmentCount: number;
    includeInBudget: boolean;
    categoryId?: string;
    merchantId?: string;
    tagIds?: string[];
  },
): Promise<ToolOutput> {
  if (args.dryRun) {
    return {
      summary: "Dry run: nothing was created.",
      data: {
        status: "dry_run",
        wouldCreate: {
          creditCardId: cardId,
          ...purchase,
          amountDisplay: majorToMoney(args.amount, currency),
        },
        wouldAlsoCreate: args.createMissing
          ? (
              await resolveClassification(
                context,
                new Problems(),
                { ...args, categoryType: "expense" },
                { dryRun: true },
              )
            ).created
          : [],
      },
    };
  }
  const classification = await resolveClassification(context, new Problems(), {
    ...args,
    categoryType: "expense",
  });
  const created = await context.client.request(creditCardsEndpoints.createPurchase, {
    params: { id: cardId },
    body: {
      ...purchase,
      ...(classification.categoryId ? { categoryId: classification.categoryId } : {}),
      ...(classification.merchantId ? { merchantId: classification.merchantId } : {}),
      ...(classification.tagIds ? { tagIds: classification.tagIds } : {}),
    },
  });
  return {
    summary: `Created credit card purchase "${created.description}" for ${toMoney(created.amount, currency).formatted} in ${created.installmentCount} installment(s).`,
    data: {
      status: "created",
      purchase: {
        purchaseId: created.purchaseId,
        transactionId: created.transactionId,
        description: created.description,
        total: toMoney(created.amount, currency),
        purchaseDate: created.purchaseDate,
        installments: created.installments.map((installment) => ({
          number: installment.installmentNumber,
          amount: toMoney(installment.amount, currency),
          dueDate: installment.dueDate,
          closingDate: installment.closingDate,
        })),
      },
      alsoCreated: classification.created,
      note: `Listed in Transactions on the purchase date; installments 2..n on the 1st of each following month. The invoice closing and due dates are in installments[].`,
    },
  };
}

export type Change = { field: string; from: unknown; to: unknown };

export function diffSummaries(before: TransactionSummary, after: TransactionSummary): Change[] {
  const fields = [
    "description",
    "date",
    "postedDate",
    "category",
    "merchant",
    "account",
    "paymentMethod",
    "includeInBudget",
  ] as const;
  const changes: Change[] = [];
  for (const field of fields)
    if (before[field] !== after[field])
      changes.push({ field, from: before[field], to: after[field] });
  if (before.amount.amount !== after.amount.amount)
    changes.push({ field: "amount", from: before.amount.formatted, to: after.amount.formatted });
  if (before.tags.join("|") !== after.tags.join("|"))
    changes.push({ field: "tags", from: before.tags, to: after.tags });
  return changes;
}

export const updateTransaction = defineTool({
  name: "update_transaction",
  title: "Update a transaction",
  description:
    'Change fields of one transaction: description, dates, amount (major units), account, payment method, category, merchant, tags (replace with tags, or addTags/removeTags), includeInBudget, competencyMonth (the monthly-plan month). Use clearCategory/clearMerchant to remove them. Returns the fields that changed (before and after). Ambiguous names return candidates with status "needs_clarification".',
  input: z.object({
    id: z.uuid(),
    description: z.string().min(1).max(512).optional(),
    date: z.iso.date().optional().describe("New purchase date."),
    postedDate: z.iso.date().optional(),
    amount: z.number().positive().optional().describe("New amount in major units, positive."),
    account: z.string().optional(),
    paymentMethod: z.string().optional(),
    category: z.string().optional(),
    clearCategory: z.boolean().optional(),
    merchant: z.string().optional(),
    clearMerchant: z.boolean().optional(),
    tags: z.array(z.string().min(1)).max(50).optional().describe("Replaces all tags."),
    addTags: z.array(z.string().min(1)).max(50).optional(),
    removeTags: z.array(z.string().min(1)).max(50).optional(),
    includeInBudget: z.boolean().optional(),
    competencyMonth: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .nullable()
      .optional()
      .describe("Income/expense: the monthly-plan month (YYYY-MM); null goes back to the default."),
    createMissing: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args) {
    const problems = new Problems();
    const before = await context.client.request(transactionsEndpoints.get, {
      params: { id: args.id },
    });
    const names = await loadNameMaps(context.refs);

    const classification = await resolveClassification(context, problems, {
      category: args.category,
      merchant: args.merchant,
      tags: args.tags,
      createMissing: args.createMissing,
      categoryType: before.type === "income" ? "income" : "expense",
    });
    let accountId: string | undefined;
    if (args.account)
      accountId = problems.take("account", await context.refs.resolveAccount(args.account));
    let paymentMethodCode: string | undefined;
    if (args.paymentMethod)
      paymentMethodCode = await resolvePaymentMethodCode(
        context,
        problems,
        args.paymentMethod,
        before.type === "income" ? "income" : "expense",
      );
    const addIds: string[] = [];
    for (const name of args.addTags ?? []) {
      const id = problems.take("addTags", await context.refs.resolveTag(name));
      if (id) addIds.push(id);
    }
    const removeIds = new Set<string>();
    for (const name of args.removeTags ?? []) {
      const id = problems.take("removeTags", await context.refs.resolveTag(name));
      if (id) removeIds.add(id);
    }
    if (problems.any) return clarificationOutput(problems);

    let tagIds = classification.tagIds;
    if (!tagIds && (addIds.length > 0 || removeIds.size > 0)) {
      tagIds = [...new Set([...before.tags.map((tag) => tag.id), ...addIds])].filter(
        (id) => !removeIds.has(id),
      );
    }

    const body: UpdateTransactionInput = {
      ...(args.description === undefined ? {} : { description: args.description }),
      ...(args.date === undefined ? {} : { purchaseDate: args.date }),
      ...(args.postedDate === undefined ? {} : { postedDate: args.postedDate }),
      ...(args.amount === undefined
        ? {}
        : {
            amount: majorToMinor(args.amount, before.currencyCode),
            currencyCode: before.currencyCode,
          }),
      ...(accountId ? { accountId } : {}),
      ...(paymentMethodCode ? { paymentMethodCode } : {}),
      ...(args.clearCategory ? { categoryId: null } : {}),
      ...(classification.categoryId ? { categoryId: classification.categoryId } : {}),
      ...(args.clearMerchant ? { merchantId: null } : {}),
      ...(classification.merchantId ? { merchantId: classification.merchantId } : {}),
      ...(tagIds ? { tagIds } : {}),
      ...(args.includeInBudget === undefined ? {} : { includeInBudget: args.includeInBudget }),
      ...(args.competencyMonth === undefined ? {} : { competencyMonth: args.competencyMonth }),
    };
    if (Object.keys(body).length === 0)
      return {
        isError: true,
        summary: "Nothing to update: pass at least one field to change.",
        data: { status: "invalid_input" },
      };

    const after = await context.client.request(transactionsEndpoints.update, {
      params: { id: args.id },
      body,
    });
    const namesAfter = await loadNameMaps(context.refs);
    const changes = diffSummaries(summarizeRow(before, names), summarizeRow(after, namesAfter));
    return {
      summary: `Updated "${after.description}": ${changes.length} field(s) changed.`,
      data: {
        status: "updated",
        changes,
        transaction: summarizeRow(after, namesAfter),
        alsoCreated: classification.created,
      },
    };
  },
});

export const deleteTransaction = defineTool({
  name: "delete_transaction",
  title: "Delete a transaction",
  description:
    "Permanently delete one transaction (for a credit card purchase this removes the whole purchase and all its installments). Requires confirm=true; without it the transaction is only shown so you can confirm with the user first.",
  input: z.object({ id: z.uuid(), confirm: z.boolean().default(false) }),
  annotations: DESTRUCTIVE,
  async handler(context, { id, confirm }) {
    const transaction = await context.client.request(transactionsEndpoints.get, { params: { id } });
    const names = await loadNameMaps(context.refs);
    const summary = summarizeRow(transaction, names);
    if (!confirm) {
      return {
        summary: "Not deleted: confirm=true is required. Show this to the user first.",
        data: { status: "confirmation_required", transaction: summary },
      };
    }
    try {
      await context.client.request(transactionsEndpoints.delete, { params: { id } });
    } catch (error) {
      if (error instanceof LurabaApiError && error.status === 404) {
        return { isError: true, summary: "Transaction not found.", data: { status: "not_found" } };
      }
      throw error;
    }
    return {
      summary: `Deleted "${summary.description}".`,
      data: { status: "deleted", deleted: summary },
    };
  },
});

export type { Transaction };
export { loadMatching };
