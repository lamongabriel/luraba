import type {
  Bill,
  BillForecast,
  BillOccurrence,
  BillOccurrenceState,
  BillSummary,
} from "@luraba/contracts/bills";
import {
  addDays,
  type BillSchedule,
  formatISODate,
  formatISODateTime,
  getBillDueDates,
  getTodayInTimezone,
  getUTCDate,
  parseISODate,
} from "@luraba/domain";
import type { z } from "zod";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import type { TxClient } from "@/db/types";
import { categoriesRepository } from "@/modules/categories/categories.repository";
import { merchantsRepository } from "@/modules/merchants/merchants.repository";
import { mapDetailedRows } from "@/modules/transactions/transactions.helpers";
import * as transactionsRepository from "@/modules/transactions/transactions.repository";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors";
import { createListMeta, type ListResult } from "@/shared/list";
import * as repository from "./bills.repository";
import type { BillRecord, OccurrenceRecord } from "./bills.types";

type CreateBillBody = z.output<typeof import("@luraba/contracts/bills").createBillBodySchema>;
type UpdateBillBody = z.output<typeof import("@luraba/contracts/bills").updateBillBodySchema>;
type Executor = typeof db | TxClient;

/** Occurrences are materialised this far ahead so the list, forecast and reminders have data. */
export const OCCURRENCE_HORIZON_DAYS = 90;

const MONTHLY_FREQUENCIES = new Set(["monthly", "quarterly", "yearly"]);
const SCHEDULE_FIELDS = [
  "frequency",
  "dayOfMonth",
  "dayOfWeek",
  "startDate",
  "endDate",
  "installmentCount",
] as const;

// ─── Mapping ─────────────────────────────────────────────────────────────

type LinkedTransaction = NonNullable<BillOccurrence["transaction"]>;

function getState(row: OccurrenceRecord, today: Date): BillOccurrenceState {
  if (row.paidAt) return "paid";
  if (row.skippedAt) return "skipped";
  return row.dueDate < today ? "overdue" : "scheduled";
}

async function loadLinkedTransactions(
  context: HouseholdContext,
  transactionIds: readonly (string | null)[],
): Promise<Map<string, LinkedTransaction>> {
  const ids = [...new Set(transactionIds.filter((id): id is string => id !== null))];
  const rows = await transactionsRepository.listDetailedByTransactionIds(context, ids);

  return new Map(
    mapDetailedRows(rows).map((transaction) => [
      transaction.id,
      {
        id: transaction.id,
        description: transaction.description,
        amount: transaction.amount,
        currencyCode: transaction.currencyCode,
        postedDate: transaction.postedDate,
      },
    ]),
  );
}

function mapOccurrence(
  row: OccurrenceRecord,
  today: Date,
  transactions: Map<string, LinkedTransaction>,
): BillOccurrence {
  return {
    id: row.id,
    billId: row.billId,
    dueDate: formatISODate(row.dueDate),
    installmentNumber: row.installmentNumber,
    expectedAmount: row.expectedAmount,
    state: getState(row, today),
    paidAt: row.paidAt ? formatISODateTime(row.paidAt) : null,
    skippedAt: row.skippedAt ? formatISODateTime(row.skippedAt) : null,
    transaction: row.transactionId ? (transactions.get(row.transactionId) ?? null) : null,
  };
}

async function buildSummaries(
  context: HouseholdContext,
  bills: readonly BillRecord[],
  today: Date,
): Promise<Map<string, BillSummary>> {
  const billIds = bills.map((bill) => bill.id);
  const [stats, nextRows, linked] = await Promise.all([
    repository.getBillStats(billIds, formatISODate(today)),
    repository.getNextOccurrences(billIds),
    repository.listLinkedOccurrences(billIds),
  ]);
  const transactions = await loadLinkedTransactions(
    context,
    linked.map((row) => row.transactionId),
  );

  const statsByBill = new Map(stats.map((row) => [row.billId, row]));
  const nextByBill = new Map(nextRows.map((row) => [row.billId, row]));
  const result = new Map<string, BillSummary>();

  for (const bill of bills) {
    const stat = statsByBill.get(bill.id);
    const next = nextByBill.get(bill.id);
    const payments = linked
      .filter((row) => row.billId === bill.id && row.transactionId)
      .map((row) => ({
        dueDate: row.dueDate,
        transaction: transactions.get(row.transactionId as string),
      }))
      .filter(
        (entry): entry is { dueDate: Date; transaction: LinkedTransaction } =>
          entry.transaction !== undefined && entry.transaction.currencyCode === bill.currencyCode,
      )
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    const totalPaid = payments.reduce((sum, entry) => sum + entry.transaction.amount, 0);
    const totalCount = stat?.totalCount ?? 0;
    const paidCount = stat?.paidCount ?? 0;
    const skippedCount = stat?.skippedCount ?? 0;

    result.set(bill.id, {
      totalCount,
      paidCount,
      skippedCount,
      overdueCount: stat?.overdueCount ?? 0,
      remainingCount:
        bill.installmentCount === null
          ? null
          : Math.max(0, bill.installmentCount - paidCount - skippedCount),
      nextDueDate: next ? formatISODate(next.dueDate) : null,
      nextExpectedAmount: next?.expectedAmount ?? null,
      totalPaid,
      averagePaid: payments.length > 0 ? Math.round(totalPaid / payments.length) : null,
      lastPaidAmount: payments.at(-1)?.transaction.amount ?? null,
    });
  }

  return result;
}

function mapBill(bill: BillRecord, summary: BillSummary): Bill {
  return {
    id: bill.id,
    name: bill.name,
    description: bill.description,
    expectedAmount: bill.expectedAmount,
    currencyCode: bill.currencyCode,
    frequency: bill.frequency,
    dayOfMonth: bill.dayOfMonth,
    dayOfWeek: bill.dayOfWeek,
    startDate: formatISODate(bill.startDate),
    endDate: bill.endDate ? formatISODate(bill.endDate) : null,
    installmentCount: bill.installmentCount,
    status: bill.status,
    categoryId: bill.categoryId,
    merchantId: bill.merchantId,
    remindDaysBefore: bill.remindDaysBefore,
    audience: bill.audience,
    summary,
    createdAt: formatISODateTime(bill.createdAt),
    updatedAt: formatISODateTime(bill.updatedAt),
  };
}

async function presentBills(
  context: HouseholdContext,
  bills: readonly BillRecord[],
): Promise<Bill[]> {
  const today = getTodayInTimezone(context.timezone);
  const summaries = await buildSummaries(context, bills, today);
  return bills.map((bill) => mapBill(bill, summaries.get(bill.id) as BillSummary));
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function requireBill(context: HouseholdContext, id: string): Promise<BillRecord> {
  const bill = await repository.getBill(context, id);
  if (!bill) throw new NotFoundError("Bill");
  return bill;
}

async function requireOccurrence(
  context: HouseholdContext,
  billId: string,
  occurrenceId: string,
): Promise<{ bill: BillRecord; occurrence: OccurrenceRecord }> {
  const bill = await requireBill(context, billId);
  const occurrence = await repository.getOccurrence(billId, occurrenceId);
  if (!occurrence) throw new NotFoundError("Bill occurrence");
  return { bill, occurrence };
}

async function validateReferences(
  context: HouseholdContext,
  body: { categoryId?: string | null; merchantId?: string | null },
): Promise<void> {
  if (body.categoryId && !(await categoriesRepository.get(body.categoryId, context))) {
    throw new ValidationError("Category not found");
  }
  if (body.merchantId && !(await merchantsRepository.get(body.merchantId, context))) {
    throw new ValidationError("Merchant not found");
  }
}

function toSchedule(bill: BillRecord): BillSchedule {
  return {
    frequency: bill.frequency,
    startDate: bill.startDate,
    endDate: bill.endDate,
    installmentCount: bill.installmentCount,
    dayOfMonth: bill.dayOfMonth,
    dayOfWeek: bill.dayOfWeek,
  };
}

/** Creates the occurrences a bill should have up to the horizon; existing ones are left alone. */
export async function ensureOccurrences(
  executor: Executor,
  bill: BillRecord,
  today: Date,
): Promise<void> {
  const until = addDays(today, OCCURRENCE_HORIZON_DAYS);
  const dueDates = getBillDueDates(toSchedule(bill), until);

  await repository.insertOccurrences(
    executor,
    dueDates.map(({ dueDate, installmentNumber }) => ({
      billId: bill.id,
      dueDate,
      installmentNumber,
      expectedAmount: bill.expectedAmount,
    })),
  );
}

// ─── Bills ───────────────────────────────────────────────────────────────

export async function createBill(context: HouseholdContext, body: CreateBillBody): Promise<Bill> {
  await validateReferences(context, body);
  const today = getTodayInTimezone(context.timezone);

  const startDate = parseISODate(formatISODate(body.startDate));
  const usesDayOfMonth = MONTHLY_FREQUENCIES.has(body.frequency);

  const created = await db.transaction(async (tx) => {
    const bill = await repository.insertBill(tx, {
      householdId: context.householdId,
      createdByUserId: context.userId,
      name: body.name,
      description: body.description ?? null,
      expectedAmount: body.expectedAmount,
      currencyCode: body.currencyCode,
      frequency: body.frequency,
      dayOfMonth: usesDayOfMonth ? (body.dayOfMonth ?? getUTCDate(startDate)) : null,
      dayOfWeek:
        body.frequency === "weekly" || body.frequency === "biweekly"
          ? (body.dayOfWeek ?? startDate.getUTCDay())
          : null,
      startDate,
      endDate: body.endDate ? parseISODate(formatISODate(body.endDate)) : null,
      installmentCount: body.installmentCount ?? null,
      categoryId: body.categoryId ?? null,
      merchantId: body.merchantId ?? null,
      remindDaysBefore: body.remindDaysBefore ?? null,
      audience: body.audience ?? "owner",
    });

    await ensureOccurrences(tx, bill, today);
    await repository.markFirstOccurrencesPaid(tx, bill.id, body.alreadyPaidCount ?? 0);
    return bill;
  });

  const [bill] = await presentBills(context, [created]);
  return bill as Bill;
}

export async function getBill(context: HouseholdContext, id: string): Promise<Bill> {
  const [bill] = await presentBills(context, [await requireBill(context, id)]);
  return bill as Bill;
}

export async function listBills(
  context: HouseholdContext,
  query: Parameters<typeof repository.listBillsPage>[1],
): Promise<ListResult<Bill>> {
  const page = await repository.listBillsPage(context, query);

  return {
    data: await presentBills(context, page.rows),
    meta: createListMeta(query, page.totalCount),
  };
}

export async function updateBill(
  context: HouseholdContext,
  id: string,
  body: UpdateBillBody,
): Promise<Bill> {
  const existing = await requireBill(context, id);
  await validateReferences(context, body);
  const today = getTodayInTimezone(context.timezone);
  const todayIso = formatISODate(today);

  const scheduleChanged = SCHEDULE_FIELDS.some(
    (field) => body[field] !== undefined && String(body[field]) !== String(existing[field]),
  );
  const amountChanged =
    body.expectedAmount !== undefined && body.expectedAmount !== existing.expectedAmount;

  const frequency = body.frequency ?? existing.frequency;
  const startDate = body.startDate
    ? parseISODate(formatISODate(body.startDate))
    : existing.startDate;

  const updated = await db.transaction(async (tx) => {
    const bill = await repository.updateBill(tx, id, {
      name: body.name,
      description: body.description,
      expectedAmount: body.expectedAmount,
      currencyCode: body.currencyCode,
      frequency: body.frequency,
      dayOfMonth: MONTHLY_FREQUENCIES.has(frequency)
        ? (body.dayOfMonth ?? existing.dayOfMonth ?? getUTCDate(startDate))
        : null,
      dayOfWeek:
        frequency === "weekly" || frequency === "biweekly"
          ? (body.dayOfWeek ?? existing.dayOfWeek ?? startDate.getUTCDay())
          : null,
      startDate: body.startDate ? startDate : undefined,
      endDate:
        body.endDate === undefined
          ? undefined
          : body.endDate
            ? parseISODate(formatISODate(body.endDate))
            : null,
      installmentCount: body.installmentCount,
      categoryId: body.categoryId,
      merchantId: body.merchantId,
      remindDaysBefore: body.remindDaysBefore,
      audience: body.audience,
    });

    if (scheduleChanged) {
      await repository.deleteUnresolvedOccurrencesFrom(tx, id, todayIso);
      if (bill.status === "active") await ensureOccurrences(tx, bill, today);
    } else if (amountChanged) {
      await repository.setUnresolvedAmountFrom(tx, id, todayIso, bill.expectedAmount);
    }

    return bill;
  });

  const [bill] = await presentBills(context, [updated]);
  return bill as Bill;
}

async function setStatus(
  context: HouseholdContext,
  id: string,
  status: "active" | "paused" | "canceled",
): Promise<Bill> {
  const existing = await requireBill(context, id);
  const today = getTodayInTimezone(context.timezone);

  const updated = await db.transaction(async (tx) => {
    const bill = await repository.updateBill(tx, id, { status });

    if (status === "canceled") {
      await repository.deleteUnresolvedOccurrencesFrom(tx, id, formatISODate(today));
    } else if (status === "active" && existing.status !== "active") {
      await ensureOccurrences(tx, bill, today);
    }

    return bill;
  });

  const [bill] = await presentBills(context, [updated]);
  return bill as Bill;
}

export const pauseBill = (context: HouseholdContext, id: string) =>
  setStatus(context, id, "paused");
export const resumeBill = (context: HouseholdContext, id: string) =>
  setStatus(context, id, "active");
export const cancelBill = (context: HouseholdContext, id: string) =>
  setStatus(context, id, "canceled");

export async function deleteBill(context: HouseholdContext, id: string): Promise<void> {
  await requireBill(context, id);
  await repository.deleteBill(id);
}

// ─── Occurrences ─────────────────────────────────────────────────────────

async function presentOccurrence(
  context: HouseholdContext,
  row: OccurrenceRecord,
): Promise<BillOccurrence> {
  const today = getTodayInTimezone(context.timezone);
  return mapOccurrence(row, today, await loadLinkedTransactions(context, [row.transactionId]));
}

export async function listOccurrences(
  context: HouseholdContext,
  billId: string,
  query: Parameters<typeof repository.listOccurrencesPage>[1],
): Promise<ListResult<BillOccurrence>> {
  await requireBill(context, billId);
  const today = getTodayInTimezone(context.timezone);
  const page = await repository.listOccurrencesPage(billId, query, formatISODate(today));
  const transactions = await loadLinkedTransactions(
    context,
    page.rows.map((row) => row.transactionId),
  );

  return {
    data: page.rows.map((row) => mapOccurrence(row, today, transactions)),
    meta: createListMeta(query, page.totalCount),
  };
}

export async function updateOccurrenceAmount(
  context: HouseholdContext,
  billId: string,
  occurrenceId: string,
  expectedAmount: number,
): Promise<BillOccurrence> {
  await requireOccurrence(context, billId, occurrenceId);
  return presentOccurrence(
    context,
    await repository.updateOccurrence(occurrenceId, { expectedAmount }),
  );
}

export async function linkTransaction(
  context: HouseholdContext,
  billId: string,
  occurrenceId: string,
  transactionId: string,
): Promise<BillOccurrence> {
  const { bill } = await requireOccurrence(context, billId, occurrenceId);

  const [transaction] = mapDetailedRows(
    await transactionsRepository.listDetailedByTransactionIds(context, [transactionId]),
  );
  if (!transaction) throw new NotFoundError("Transaction");
  if (transaction.type !== "expense") {
    throw new ValidationError("Only expense transactions can pay a bill");
  }
  if (transaction.currencyCode !== bill.currencyCode) {
    throw new ValidationError(`This bill is in ${bill.currencyCode}; the transaction is not`);
  }

  try {
    return presentOccurrence(
      context,
      await repository.updateOccurrence(occurrenceId, {
        transactionId,
        paidAt: new Date(),
        skippedAt: null,
      }),
    );
  } catch (error) {
    // The partial unique index allows one occurrence per transaction.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new ConflictError("This transaction is already linked to a bill payment");
    }
    throw error;
  }
}

export async function markOccurrencePaid(
  context: HouseholdContext,
  billId: string,
  occurrenceId: string,
): Promise<BillOccurrence> {
  await requireOccurrence(context, billId, occurrenceId);
  return presentOccurrence(
    context,
    await repository.updateOccurrence(occurrenceId, { paidAt: new Date(), skippedAt: null }),
  );
}

export async function skipOccurrence(
  context: HouseholdContext,
  billId: string,
  occurrenceId: string,
): Promise<BillOccurrence> {
  await requireOccurrence(context, billId, occurrenceId);
  return presentOccurrence(
    context,
    await repository.updateOccurrence(occurrenceId, {
      skippedAt: new Date(),
      paidAt: null,
      transactionId: null,
    }),
  );
}

export async function resetOccurrence(
  context: HouseholdContext,
  billId: string,
  occurrenceId: string,
): Promise<BillOccurrence> {
  await requireOccurrence(context, billId, occurrenceId);
  return presentOccurrence(
    context,
    await repository.updateOccurrence(occurrenceId, {
      paidAt: null,
      skippedAt: null,
      transactionId: null,
    }),
  );
}

// ─── Forecast ────────────────────────────────────────────────────────────

export async function getForecast(
  context: HouseholdContext,
  query: { from: string; to: string },
): Promise<BillForecast> {
  const today = getTodayInTimezone(context.timezone);
  const rows = await repository.listForecastRows(context, query.from, query.to);

  const items = rows
    .filter((row) => row.skippedAt === null)
    .map((row) => ({
      occurrenceId: row.occurrenceId,
      billId: row.billId,
      billName: row.billName,
      dueDate: formatISODate(row.dueDate),
      expectedAmount: row.expectedAmount,
      currencyCode: row.currencyCode,
      state: (row.paidAt ? "paid" : row.dueDate < today ? "overdue" : "scheduled") as
        | "paid"
        | "overdue"
        | "scheduled",
    }));

  const months = new Map<
    string,
    { month: string; currencyCode: string; expectedTotal: number; count: number }
  >();
  for (const item of items) {
    const month = item.dueDate.slice(0, 7);
    const key = `${month}:${item.currencyCode}`;
    const entry = months.get(key) ?? {
      month,
      currencyCode: item.currencyCode,
      expectedTotal: 0,
      count: 0,
    };
    entry.expectedTotal += item.expectedAmount;
    entry.count += 1;
    months.set(key, entry);
  }

  return { items, months: [...months.values()] };
}
