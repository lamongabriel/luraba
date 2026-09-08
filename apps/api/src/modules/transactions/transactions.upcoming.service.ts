import {
  transactionAnalyticsQuerySchema,
  upcomingTransactionSchema,
  type upcomingTransactionsQuerySchema,
} from "@luraba/contracts/transactions";
import type { z } from "zod";
import type { HouseholdContext } from "@/config/permissions";
import * as recurringBillsRepository from "@/modules/recurring-bills/recurring-bills.repository";
import { getOccurrenceDates } from "@/modules/recurring-bills/recurring-bills.service";
import { addDays, formatISODate, getTodayInTimezone } from "@/shared/lib/date";
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
      recurringFrequency: null,
    }),
  );

  const recurringCandidates = await recurringBillsRepository.listUpcomingCandidates(
    context,
    filters,
  );
  const recurring = (
    await Promise.all(
      recurringCandidates.map(async ({ bill, accountName, categoryName, merchantName }) => {
        const dates = getOccurrenceDates(bill, tomorrow, end);
        const rows = await Promise.all(
          dates.map(async (date) => {
            const occurrence = await recurringBillsRepository.getOccurrence(context, bill.id, date);
            return { date, occurrence };
          }),
        );
        return rows
          .filter(
            ({ occurrence }) =>
              !occurrence ||
              ((occurrence.status === "scheduled" || occurrence.status === "rescheduled") &&
                !occurrence.transactionId),
          )
          .map(({ date, occurrence }) => {
            const effectiveDate = occurrence?.rescheduledDate ?? date;
            if (effectiveDate < tomorrow || effectiveDate > end) return null;
            return upcomingTransactionSchema.parse({
              sourceType: "recurring_bill",
              sourceId: bill.id,
              parentId: bill.id,
              description: bill.name,
              effectiveDate: formatISODate(effectiveDate),
              amount: bill.amount,
              currencyCode: bill.currencyCode,
              accountId: bill.accountId,
              accountName,
              creditCardId: null,
              creditCardName: null,
              categoryId: bill.categoryId,
              categoryName,
              merchantId: bill.merchantId,
              merchantName,
              installmentNumber: null,
              installmentCount: null,
              recurringFrequency: bill.frequency,
            });
          })
          .filter((row): row is UpcomingTransaction => row !== null);
      }),
    )
  ).flat();

  const data = [...installments, ...recurring].sort(
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
