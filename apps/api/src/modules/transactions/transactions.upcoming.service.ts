import {
  transactionAnalyticsQuerySchema,
  upcomingTransactionSchema,
  type upcomingTransactionsQuerySchema,
} from "@luraba/contracts/transactions";
import { addDays, formatISODate, getTodayInTimezone } from "@luraba/domain";
import type { z } from "zod";
import type { HouseholdContext } from "@/config/permissions";
import * as billsRepository from "@/modules/bills/bills.repository";
import { createListMeta } from "@/shared/list";
import * as repository from "./transactions.analytics.repository";
import type { TransactionFilterQuery } from "./transactions.query";
import type { UpcomingTransaction } from "./transactions.types";

type UpcomingQuery = z.output<typeof upcomingTransactionsQuerySchema>;

function toFilterQuery(query: UpcomingQuery): TransactionFilterQuery {
  const {
    page: _page,
    perPage: _perPage,
    sort: _sort,
    sortDirection: _sortDirection,
    ...filters
  } = query;
  return transactionAnalyticsQuerySchema.parse(filters);
}

/** Bills only have a name, amount, category and merchant, so filters on anything else exclude them. */
async function listUpcomingBills(
  context: HouseholdContext,
  filters: TransactionFilterQuery,
  toDate: string,
  today: Date,
): Promise<UpcomingTransaction[]> {
  const unsupported =
    filters.accountIds?.length ||
    filters.creditCardIds?.length ||
    filters.tagIds?.length ||
    filters.paymentMethodCodes?.length ||
    (filters.originTypes?.length && !filters.originTypes.includes("expense"));
  if (unsupported) return [];

  const rows = await billsRepository.listUpcomingOccurrences(context.householdId, toDate, filters);

  return rows.map((row) =>
    upcomingTransactionSchema.parse({
      sourceType: "bill_occurrence",
      sourceId: row.occurrenceId,
      parentId: row.billId,
      description: row.name,
      effectiveDate: formatISODate(row.dueDate),
      amount: row.expectedAmount,
      currencyCode: row.currencyCode,
      accountId: null,
      accountName: null,
      creditCardId: null,
      creditCardName: null,
      categoryId: row.categoryId,
      categoryName: null,
      merchantId: row.merchantId,
      merchantName: null,
      installmentNumber: row.installmentNumber,
      installmentCount: row.installmentCount,
      isOverdue: row.dueDate < today,
    }),
  );
}

export async function listUpcomingTransactions(context: HouseholdContext, query: UpcomingQuery) {
  const today = getTodayInTimezone(context.timezone);
  const tomorrow = addDays(today, 1);
  const end = addDays(today, 30);
  const fromDate = formatISODate(tomorrow);
  const toDate = formatISODate(end);
  const filters = toFilterQuery(query);

  const installmentRows = await repository.listUpcomingInstallments(
    context.householdId,
    filters,
    fromDate,
    toDate,
  );
  const installments: UpcomingTransaction[] = installmentRows.map((row) =>
    upcomingTransactionSchema.parse({
      sourceType: "credit_card_installment",
      sourceId: row.sourceId,
      parentId: row.parentId,
      description: row.description,
      effectiveDate: row.effectiveDate,
      amount: row.amount,
      currencyCode: row.currencyCode,
      accountId: row.accountId,
      accountName: row.accountName,
      creditCardId: row.creditCardId,
      creditCardName: row.creditCardName,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      merchantId: row.merchantId,
      merchantName: row.merchantName,
      installmentNumber: row.installmentNumber,
      installmentCount: row.installmentCount,
    }),
  );

  const bills = await listUpcomingBills(context, filters, toDate, today);

  const data = [...installments, ...bills].sort(
    (a, b) =>
      (query.sortDirection === "desc" ? -1 : 1) *
      (a.effectiveDate.localeCompare(b.effectiveDate) || a.sourceId.localeCompare(b.sourceId)),
  );
  const offset = (query.page - 1) * query.perPage;
  return {
    data: data.slice(offset, offset + query.perPage),
    meta: createListMeta(query, data.length),
  };
}
