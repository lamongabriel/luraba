import {
  type createRecurringBillBodySchema,
  type listRecurringBillsQuerySchema,
  recurringBillSchema,
  recurringOccurrenceSchema,
  type updateRecurringBillBodySchema,
} from "@luraba/contracts/recurring-bills";
import {
  formatISODate,
  formatISODateTime,
  getRecurrencyDates,
  parseISODate,
  type RecurrencyFrequency,
} from "@luraba/domain";
import type { z } from "zod";
import type { HouseholdContext } from "@/config/permissions";
import { paymentMethodsRepository } from "@/modules/payment-methods/payment-methods.repository";
import * as transactionsService from "@/modules/transactions/transactions.service";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors";
import { createListMeta } from "@/shared/list";
import * as repository from "./recurring-bills.repository";
import type { RecurringBillRecord } from "./recurring-bills.types";

type CreateRecurringBillValues = z.output<typeof createRecurringBillBodySchema>;
type UpdateRecurringBillValues = z.output<typeof updateRecurringBillBodySchema>;
type ListRecurringBillsQuery = z.output<typeof listRecurringBillsQuerySchema>;

function mapBill(row: RecurringBillRecord) {
  return recurringBillSchema.parse({
    ...row,
    startDate: formatISODate(row.startDate),
    endDate: row.endDate ? formatISODate(row.endDate) : null,
    createdAt: formatISODateTime(row.createdAt),
    updatedAt: formatISODateTime(row.updatedAt),
  });
}

async function resolvePaymentMethod(
  context: HouseholdContext,
  code: string | undefined,
  currencyCode: string,
) {
  if (!code) return null;
  const paymentMethod = await paymentMethodsRepository.findAvailableByCode(
    context,
    code,
    currencyCode,
  );
  if (!paymentMethod)
    throw new ValidationError(`Payment method ${code} is not available for ${currencyCode}`);
  return paymentMethod;
}

export async function list(context: HouseholdContext, query: ListRecurringBillsQuery) {
  const result = await repository.list(context, query);
  return { data: result.rows.map(mapBill), meta: createListMeta(query, result.totalCount) };
}

export async function get(context: HouseholdContext, id: string) {
  const row = await repository.get(context, id);
  if (!row) throw new NotFoundError("Recurring bill");
  return mapBill(row);
}

export async function create(context: HouseholdContext, body: CreateRecurringBillValues) {
  const method = await resolvePaymentMethod(context, body.paymentMethodCode, body.currencyCode);
  const row = await repository.create(context, body, method?.id ?? null);
  return mapBill(row);
}

export async function update(
  context: HouseholdContext,
  id: string,
  body: UpdateRecurringBillValues,
) {
  const existing = await repository.get(context, id);
  if (!existing) throw new NotFoundError("Recurring bill");
  const method =
    body.paymentMethodCode !== undefined
      ? await resolvePaymentMethod(
          context,
          body.paymentMethodCode,
          body.currencyCode ?? existing.currencyCode,
        )
      : undefined;
  const row = await repository.update(context, id, body, method?.id ?? null);
  if (!row) throw new NotFoundError("Recurring bill");
  return mapBill(row);
}

export async function remove(context: HouseholdContext, id: string) {
  if (!(await repository.get(context, id))) throw new NotFoundError("Recurring bill");
  await repository.remove(context, id);
}

export async function listOccurrences(
  context: HouseholdContext,
  id: string,
  from: string,
  to: string,
) {
  const bill = await repository.get(context, id);
  if (!bill) throw new NotFoundError("Recurring bill");
  const dates = getRecurrencyDates(
    {
      startDate: bill.startDate,
      endDate: bill.endDate,
      frequency: bill.frequency as RecurrencyFrequency,
      dayOfMonth: bill.dayOfMonth,
      dayOfWeek: bill.dayOfWeek,
    },
    { from: parseISODate(from), to: parseISODate(to) },
  );
  const rows = await Promise.all(
    dates.map(async (date) => {
      const stored = await repository.getOccurrence(context, id, date);
      return recurringOccurrenceSchema.parse({
        id: stored?.id ?? `${id}:${formatISODate(date)}`,
        recurringBillId: id,
        occurrenceDate: formatISODate(date),
        effectiveDate: formatISODate(stored?.rescheduledDate ?? date),
        status: stored?.status ?? "scheduled",
        rescheduledDate: stored?.rescheduledDate ? formatISODate(stored.rescheduledDate) : null,
        transactionId: stored?.transactionId ?? null,
      });
    }),
  );
  return rows;
}

async function saveOccurrenceAction(
  context: HouseholdContext,
  id: string,
  date: string,
  values: Parameters<typeof repository.saveOccurrence>[2],
) {
  if (!(await repository.get(context, id))) throw new NotFoundError("Recurring bill");
  return repository.saveOccurrence(id, parseISODate(date), values);
}

export async function skipOccurrence(context: HouseholdContext, id: string, date: string) {
  await saveOccurrenceAction(context, id, date, { status: "skipped" });
}

export async function rescheduleOccurrence(
  context: HouseholdContext,
  id: string,
  date: string,
  next: string,
) {
  await saveOccurrenceAction(context, id, date, {
    status: "rescheduled",
    rescheduledDate: parseISODate(next),
  });
}

export async function createOccurrence(context: HouseholdContext, id: string, date: string) {
  const bill = await repository.get(context, id);
  if (!bill) throw new NotFoundError("Recurring bill");
  const existing = await repository.getOccurrence(context, id, parseISODate(date));
  if (existing?.transactionId)
    throw new ConflictError("This recurring occurrence already created a transaction");
  const paymentMethod = bill.paymentMethodId
    ? await paymentMethodsRepository.get(bill.paymentMethodId, context)
    : null;
  if (!paymentMethod)
    throw new ValidationError("A payment method is required to create a transaction");
  const transaction = await transactionsService.createTransaction(context, {
    type: bill.type as "income" | "expense",
    description: bill.name,
    amount: bill.amount,
    currencyCode: bill.currencyCode,
    accountId: bill.accountId,
    categoryId: bill.categoryId,
    merchantId: bill.merchantId ?? undefined,
    paymentMethodCode: paymentMethod.code,
    purchaseDate: parseISODate(date),
    postedDate: parseISODate(date),
  });
  await saveOccurrenceAction(context, id, date, {
    status: "created",
    transactionId: transaction.id,
  });
  return transaction;
}
