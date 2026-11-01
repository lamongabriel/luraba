import {
  type ListTransactionsQuery,
  type TransactionFeedRow,
  transactionsEndpoints,
} from "@luraba/contracts";
import { z } from "zod";
import { fetchAllPages, PAGE_SIZE } from "../client/fetch-all.js";
import { majorToMinor } from "../format/money.js";
import { Problems } from "../resolve/problems.js";
import type { ToolContext } from "./types.js";

const ORIGIN_TYPES = [
  "expense",
  "income",
  "transfer",
  "adjustment",
  "credit_card_installment",
  "credit_card_payment",
] as const;

const names = z.array(z.string().min(1)).max(50);

/** Filters shared by `search_transactions` and the bulk tools' "by filter" selection. */
export const transactionFilterShape = {
  dateFrom: z.iso.date().optional().describe("Posted date on or after this day (YYYY-MM-DD)."),
  dateTo: z.iso.date().optional().describe("Posted date on or before this day (YYYY-MM-DD)."),
  purchaseDateFrom: z.iso.date().optional().describe("Purchase date on or after this day."),
  purchaseDateTo: z.iso.date().optional().describe("Purchase date on or before this day."),
  accounts: names.optional().describe("Account names or ids (a bank name matches its accounts)."),
  creditCards: names.optional().describe("Credit card names, last 4 digits or ids."),
  categories: names.optional().describe("Category names or ids."),
  uncategorized: z.boolean().optional().describe("Only transactions without a category."),
  merchants: names.optional().describe("Merchant names or ids."),
  tags: names.optional().describe("Tag names or ids."),
  types: z
    .array(z.enum(ORIGIN_TYPES))
    .optional()
    .describe(
      "Transaction types. Credit card purchases appear as credit_card_installment rows; card bill payments as credit_card_payment.",
    ),
  amountMin: z.number().min(0).optional().describe("Smallest absolute amount, in major units."),
  amountMax: z.number().min(0).optional().describe("Largest absolute amount, in major units."),
  currency: z
    .string()
    .length(3)
    .optional()
    .describe("Currency of amountMin/amountMax and currencies to match, e.g. USD."),
  text: z.string().optional().describe("Text to look for in the description."),
  includeInBudget: z
    .boolean()
    .optional()
    .describe("Only rows counted (true) or not counted in budgets."),
} as const;

export const transactionFilterSchema = z.object(transactionFilterShape);
export type TransactionFilter = z.output<typeof transactionFilterSchema>;

export type BuiltQuery = {
  query: ListTransactionsQuery;
  problems: Problems;
};

async function resolveAll(
  problems: Problems,
  field: string,
  queries: string[] | undefined,
  resolve: (query: string) => ReturnType<ToolContext["refs"]["resolveAccount"]>,
): Promise<string[] | undefined> {
  if (!queries || queries.length === 0) return undefined;
  const ids: string[] = [];
  for (const query of queries) {
    const id = problems.take(field, await resolve(query));
    if (id) ids.push(id);
  }
  return ids;
}

/** Turns names into ids and major units into minor units; unresolved names become problems. */
export async function buildTransactionQuery(
  context: ToolContext,
  filter: TransactionFilter,
  paging: { page?: number; perPage?: number; sort?: string; sortDirection?: "asc" | "desc" } = {},
): Promise<BuiltQuery> {
  const { refs } = context;
  const problems = new Problems();
  const [accountIds, creditCardIds, categoryIds, merchantIds, tagIds] = await Promise.all([
    resolveAll(problems, "accounts", filter.accounts, (q) => refs.resolveAccount(q)),
    resolveAll(problems, "creditCards", filter.creditCards, (q) => refs.resolveCreditCard(q)),
    resolveAll(problems, "categories", filter.categories, (q) => refs.resolveCategory(q)),
    resolveAll(problems, "merchants", filter.merchants, (q) => refs.resolveMerchant(q)),
    resolveAll(problems, "tags", filter.tags, (q) => refs.resolveTag(q)),
  ]);

  const needsCurrency = filter.amountMin !== undefined || filter.amountMax !== undefined;
  const currency =
    filter.currency?.toUpperCase() ?? (needsCurrency ? await refs.defaultCurrency() : undefined);

  const query = {
    ...paging,
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo,
    purchaseDateFrom: filter.purchaseDateFrom,
    purchaseDateTo: filter.purchaseDateTo,
    accountIds,
    creditCardIds,
    categoryIds,
    merchantIds,
    tagIds,
    uncategorized: filter.uncategorized,
    originTypes: filter.types,
    amountMin:
      filter.amountMin !== undefined && currency
        ? majorToMinor(filter.amountMin, currency)
        : undefined,
    amountMax:
      filter.amountMax !== undefined && currency
        ? majorToMinor(filter.amountMax, currency)
        : undefined,
    currencyCodes: filter.currency ? [filter.currency.toUpperCase()] : undefined,
    search: filter.text,
    includeInBudget: filter.includeInBudget,
  } as ListTransactionsQuery;
  return { query, problems };
}

/** Every transaction matching a query, up to `limit`; `truncated` when there are more. */
export async function loadMatching(
  context: ToolContext,
  query: ListTransactionsQuery,
  limit: number,
): Promise<{ rows: TransactionFeedRow[]; truncated: boolean; totalCount: number }> {
  let totalCount = 0;
  const rows = await fetchAllPages(async (page) => {
    const result = await context.client.request(transactionsEndpoints.list, {
      query: { ...query, page, perPage: PAGE_SIZE },
    });
    totalCount = result.meta.pagination.totalCount;
    return result;
  });
  return { rows: rows.slice(0, limit), truncated: totalCount > limit, totalCount };
}
