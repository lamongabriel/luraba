import {
  transactionAnalyticsQuerySchema,
  upcomingTransactionSchema,
  type upcomingTransactionsQuerySchema,
} from "@luraba/contracts/transactions";
import { addDays, formatISODate, getTodayInTimezone } from "@luraba/domain";
import type { z } from "zod";
import type { HouseholdContext } from "@/config/permissions";
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

  const data = installments.sort(
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
