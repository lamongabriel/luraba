import type {
  addSplitInstallmentsBodySchema,
  SplitDetail,
  SplitInstallment,
  SplitInstallmentState,
  SplitParticipant,
  SplitSummary,
  splitInstallmentInputSchema,
  splitParticipantInputSchema,
} from "@luraba/contracts/splits";
import { formatISODate, formatISODateTime, getTodayInTimezone, parseISODate } from "@luraba/domain";
import type { z } from "zod";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { mapDetailedRows } from "@/modules/transactions/transactions.helpers";
import * as transactionsRepository from "@/modules/transactions/transactions.repository";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors";
import { createListMeta, type ListResult } from "@/shared/list";
import { splitsRepository } from "./splits.repository";
import type { InstallmentRecord, ParticipantRecord, SplitRecord } from "./splits.types";

type SplitInstallmentInput = z.output<typeof splitInstallmentInputSchema>;
type SplitParticipantInput = z.output<typeof splitParticipantInputSchema>;
type AddSplitInstallmentsInput = z.output<typeof addSplitInstallmentsBodySchema>;
type LinkedTransaction = NonNullable<SplitInstallment["transaction"]>;
type Totals = SplitParticipant["totals"];

// ─── Mapping ─────────────────────────────────────────────────────────────

export function getInstallmentState(row: InstallmentRecord, today: Date): SplitInstallmentState {
  if (row.receivedAt) return "received";
  if (row.writtenOffAt) return "written_off";
  if (row.skippedAt) return "skipped";
  return (row.graceUntil ?? row.dueDate) < today ? "overdue" : "scheduled";
}

async function loadLinkedTransactions(
  context: HouseholdContext,
  rows: readonly InstallmentRecord[],
): Promise<Map<string, LinkedTransaction>> {
  const ids = [...new Set(rows.map((row) => row.transactionId).filter((id) => id !== null))];
  const found = await transactionsRepository.listDetailedByTransactionIds(context, ids);

  return new Map(
    mapDetailedRows(found).map((transaction) => [
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

function mapInstallment(
  row: InstallmentRecord,
  today: Date,
  transactions: Map<string, LinkedTransaction>,
): SplitInstallment {
  return {
    id: row.id,
    participantId: row.participantId,
    dueDate: formatISODate(row.dueDate),
    graceUntil: row.graceUntil ? formatISODate(row.graceUntil) : null,
    expectedAmount: row.expectedAmount,
    state: getInstallmentState(row, today),
    receivedAt: row.receivedAt ? formatISODateTime(row.receivedAt) : null,
    skippedAt: row.skippedAt ? formatISODateTime(row.skippedAt) : null,
    writtenOffAt: row.writtenOffAt ? formatISODateTime(row.writtenOffAt) : null,
    transaction: row.transactionId ? (transactions.get(row.transactionId) ?? null) : null,
  };
}

export function computeTotals(installments: readonly SplitInstallment[]): Totals {
  const totals: Totals = {
    owed: 0,
    received: 0,
    writtenOff: 0,
    outstanding: 0,
    installmentCount: installments.length,
    receivedCount: 0,
    overdueCount: 0,
    nextDueDate: null,
  };

  for (const installment of installments) {
    if (installment.state !== "skipped") totals.owed += installment.expectedAmount;

    switch (installment.state) {
      case "received":
        totals.received += installment.transaction?.amount ?? installment.expectedAmount;
        totals.receivedCount += 1;
        break;
      case "written_off":
        totals.writtenOff += installment.expectedAmount;
        break;
      case "overdue":
        totals.overdueCount += 1;
        totals.outstanding += installment.expectedAmount;
        break;
      case "scheduled":
        totals.outstanding += installment.expectedAmount;
        break;
    }

    if (
      (installment.state === "scheduled" || installment.state === "overdue") &&
      (totals.nextDueDate === null || installment.dueDate < totals.nextDueDate)
    ) {
      totals.nextDueDate = installment.dueDate;
    }
  }

  return totals;
}

function summarize(participants: readonly SplitParticipant[]): SplitSummary {
  const summary: SplitSummary = {
    participantCount: participants.length,
    owed: 0,
    received: 0,
    writtenOff: 0,
    outstanding: 0,
    overdueCount: 0,
    unpaidParticipantNames: [],
  };

  for (const participant of participants) {
    summary.owed += participant.totals.owed;
    summary.received += participant.totals.received;
    summary.writtenOff += participant.totals.writtenOff;
    summary.outstanding += participant.totals.outstanding;
    summary.overdueCount += participant.totals.overdueCount;
    if (participant.totals.outstanding > 0) summary.unpaidParticipantNames.push(participant.name);
  }

  return summary;
}

async function buildDetails(
  context: HouseholdContext,
  splits: readonly SplitRecord[],
): Promise<SplitDetail[]> {
  const today = getTodayInTimezone(context.timezone);
  const participantRows = await splitsRepository.listParticipants(splits.map((split) => split.id));
  const installmentRows = await splitsRepository.listInstallments(
    participantRows.map((row) => row.id),
  );
  const transactions = await loadLinkedTransactions(context, installmentRows);

  const installmentsByParticipant = new Map<string, SplitInstallment[]>();
  for (const row of installmentRows) {
    const list = installmentsByParticipant.get(row.participantId) ?? [];
    list.push(mapInstallment(row, today, transactions));
    installmentsByParticipant.set(row.participantId, list);
  }

  const participantsBySplit = new Map<string, SplitParticipant[]>();
  for (const row of participantRows) {
    const installments = installmentsByParticipant.get(row.id) ?? [];
    const list = participantsBySplit.get(row.splitId) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      notes: row.notes,
      totals: computeTotals(installments),
      installments,
    });
    participantsBySplit.set(row.splitId, list);
  }

  return splits.map((split) => {
    const participants = participantsBySplit.get(split.id) ?? [];
    return {
      id: split.id,
      title: split.title,
      description: split.description,
      totalAmount: split.totalAmount,
      currencyCode: split.currencyCode,
      status: split.status,
      sourceTransactionId: split.sourceTransactionId,
      summary: summarize(participants),
      participants,
      createdAt: formatISODateTime(split.createdAt),
      updatedAt: formatISODateTime(split.updatedAt),
    };
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function requireSplit(context: HouseholdContext, id: string): Promise<SplitRecord> {
  const split = await splitsRepository.get(id, context);
  if (!split) throw new NotFoundError("Split");
  return split;
}

async function requireInstallment(context: HouseholdContext, splitId: string, id: string) {
  const split = await requireSplit(context, splitId);
  const installment = await splitsRepository.getInstallment(splitId, id);
  if (!installment) throw new NotFoundError("Installment");
  return { split, installment };
}

async function presentSplit(context: HouseholdContext, id: string): Promise<SplitDetail> {
  const [detail] = await buildDetails(context, [await requireSplit(context, id)]);
  return detail as SplitDetail;
}

async function presentInstallment(
  context: HouseholdContext,
  row: InstallmentRecord,
): Promise<SplitInstallment> {
  const today = getTodayInTimezone(context.timezone);
  return mapInstallment(row, today, await loadLinkedTransactions(context, [row]));
}

function toInstallmentRows(participantId: string, installments: readonly SplitInstallmentInput[]) {
  return installments.map((installment) => {
    const dueDate = parseISODate(formatISODate(installment.dueDate));
    const graceUntil = installment.graceUntil
      ? parseISODate(formatISODate(installment.graceUntil))
      : null;
    if (graceUntil && graceUntil < dueDate) {
      throw new ValidationError("The grace period cannot end before the due date");
    }
    return { participantId, dueDate, graceUntil, expectedAmount: installment.expectedAmount };
  });
}

async function insertParticipantWithInstallments(
  executor: Parameters<typeof splitsRepository.insertParticipant>[0],
  splitId: string,
  participant: SplitParticipantInput,
  createdAt?: Date,
) {
  const created = await splitsRepository.insertParticipant(executor, {
    splitId,
    createdAt,
    name: participant.name,
    notes: participant.notes ?? null,
  });
  await splitsRepository.insertInstallments(
    executor,
    toInstallmentRows(created.id, participant.installments ?? []),
  );
}

// ─── Splits ──────────────────────────────────────────────────────────────

export async function createSplit(
  context: HouseholdContext,
  body: {
    title: string;
    description?: string | null;
    totalAmount?: number | null;
    currencyCode: string;
    sourceTransactionId?: string | null;
    participants: SplitParticipantInput[];
  },
): Promise<SplitDetail> {
  if (body.sourceTransactionId) await requireTransaction(context, body.sourceTransactionId);

  const created = await db.transaction(async (tx) => {
    const split = await splitsRepository.create(
      context,
      {
        createdByUserId: context.userId,
        title: body.title,
        description: body.description ?? null,
        totalAmount: body.totalAmount ?? null,
        currencyCode: body.currencyCode,
        sourceTransactionId: body.sourceTransactionId ?? null,
      },
      tx,
    );
    // Rows inserted in one transaction share a timestamp, so space them out to keep the order.
    const base = Date.now();
    for (const [index, participant] of body.participants.entries()) {
      await insertParticipantWithInstallments(tx, split.id, participant, new Date(base + index));
    }
    return split;
  });

  return presentSplit(context, created.id);
}

export async function getSplit(context: HouseholdContext, id: string): Promise<SplitDetail> {
  return presentSplit(context, id);
}

export async function listSplits(
  context: HouseholdContext,
  query: Parameters<typeof splitsRepository.listPage>[1],
): Promise<ListResult<Omit<SplitDetail, "participants">>> {
  const page = await splitsRepository.listPage(context, query);
  const details = await buildDetails(context, page.rows);

  return {
    data: details.map(({ participants: _participants, ...split }) => split),
    meta: createListMeta(query, page.totalCount),
  };
}

export async function updateSplit(
  context: HouseholdContext,
  id: string,
  body: {
    title?: string;
    description?: string | null;
    totalAmount?: number | null;
    sourceTransactionId?: string | null;
    status?: "active" | "closed";
  },
): Promise<SplitDetail> {
  await requireSplit(context, id);
  if (body.sourceTransactionId) await requireTransaction(context, body.sourceTransactionId);
  await splitsRepository.update(id, context, body);
  return presentSplit(context, id);
}

export async function deleteSplit(context: HouseholdContext, id: string): Promise<void> {
  await requireSplit(context, id);
  await splitsRepository.delete(id, context);
}

// ─── Participants ────────────────────────────────────────────────────────

export async function addParticipant(
  context: HouseholdContext,
  splitId: string,
  body: SplitParticipantInput,
): Promise<SplitDetail> {
  await requireSplit(context, splitId);
  await db.transaction((tx) => insertParticipantWithInstallments(tx, splitId, body));
  return presentSplit(context, splitId);
}

export async function updateParticipant(
  context: HouseholdContext,
  splitId: string,
  participantId: string,
  body: { name?: string; notes?: string | null },
): Promise<SplitDetail> {
  await requireSplit(context, splitId);
  if (!(await splitsRepository.getParticipant(splitId, participantId))) {
    throw new NotFoundError("Participant");
  }
  await splitsRepository.updateParticipant(participantId, body);
  return presentSplit(context, splitId);
}

export async function removeParticipant(
  context: HouseholdContext,
  splitId: string,
  participantId: string,
): Promise<SplitDetail> {
  await requireSplit(context, splitId);
  if (!(await splitsRepository.getParticipant(splitId, participantId))) {
    throw new NotFoundError("Participant");
  }
  await splitsRepository.deleteParticipant(participantId);
  return presentSplit(context, splitId);
}

export async function addInstallments(
  context: HouseholdContext,
  splitId: string,
  participantId: string,
  body: AddSplitInstallmentsInput,
): Promise<SplitDetail> {
  await requireSplit(context, splitId);
  const participant: ParticipantRecord | undefined = await splitsRepository.getParticipant(
    splitId,
    participantId,
  );
  if (!participant) throw new NotFoundError("Participant");

  await splitsRepository.insertInstallments(
    db,
    toInstallmentRows(participantId, body.installments),
  );
  return presentSplit(context, splitId);
}

// ─── Installments ────────────────────────────────────────────────────────

async function requireTransaction(context: HouseholdContext, transactionId: string) {
  const [transaction] = mapDetailedRows(
    await transactionsRepository.listDetailedByTransactionIds(context, [transactionId]),
  );
  if (!transaction) throw new NotFoundError("Transaction");
  return transaction;
}

export async function updateInstallment(
  context: HouseholdContext,
  splitId: string,
  installmentId: string,
  body: { dueDate?: unknown; expectedAmount?: number; graceUntil?: unknown },
): Promise<SplitInstallment> {
  const { installment } = await requireInstallment(context, splitId, installmentId);
  const dueDate = body.dueDate ? parseISODate(formatISODate(body.dueDate as Date)) : undefined;
  const graceUntil =
    body.graceUntil === undefined
      ? undefined
      : body.graceUntil === null
        ? null
        : parseISODate(formatISODate(body.graceUntil as Date));
  const effectiveDue = dueDate ?? installment.dueDate;
  const effectiveGrace = graceUntil === undefined ? installment.graceUntil : graceUntil;
  if (effectiveGrace && effectiveGrace < effectiveDue) {
    throw new ValidationError("The grace period cannot end before the due date");
  }

  return presentInstallment(
    context,
    await splitsRepository.updateInstallment(installmentId, {
      dueDate,
      graceUntil,
      expectedAmount: body.expectedAmount,
    }),
  );
}

export async function removeInstallment(
  context: HouseholdContext,
  splitId: string,
  installmentId: string,
): Promise<void> {
  await requireInstallment(context, splitId, installmentId);
  await splitsRepository.deleteInstallment(installmentId);
}

const CLEARED = { receivedAt: null, skippedAt: null, writtenOffAt: null, transactionId: null };

export async function linkInstallment(
  context: HouseholdContext,
  splitId: string,
  installmentId: string,
  transactionId: string,
): Promise<SplitInstallment> {
  const { split } = await requireInstallment(context, splitId, installmentId);
  const transaction = await requireTransaction(context, transactionId);

  if (transaction.type !== "income") {
    throw new ValidationError("Only incoming transactions can be a split payment");
  }
  if (transaction.currencyCode !== split.currencyCode) {
    throw new ValidationError(`This split is in ${split.currencyCode}; the transaction is not`);
  }

  try {
    return presentInstallment(
      context,
      await splitsRepository.updateInstallment(installmentId, {
        ...CLEARED,
        transactionId,
        receivedAt: new Date(),
      }),
    );
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new ConflictError("This transaction is already linked to a split payment");
    }
    throw error;
  }
}

async function setResolution(
  context: HouseholdContext,
  splitId: string,
  installmentId: string,
  values: Partial<Pick<InstallmentRecord, "receivedAt" | "skippedAt" | "writtenOffAt">>,
): Promise<SplitInstallment> {
  await requireInstallment(context, splitId, installmentId);
  return presentInstallment(
    context,
    await splitsRepository.updateInstallment(installmentId, { ...CLEARED, ...values }),
  );
}

export const receiveInstallment = (c: HouseholdContext, s: string, i: string) =>
  setResolution(c, s, i, { receivedAt: new Date() });
export const skipInstallment = (c: HouseholdContext, s: string, i: string) =>
  setResolution(c, s, i, { skippedAt: new Date() });
export const writeOffInstallment = (c: HouseholdContext, s: string, i: string) =>
  setResolution(c, s, i, { writtenOffAt: new Date() });
export const resetInstallment = (c: HouseholdContext, s: string, i: string) =>
  setResolution(c, s, i, {});
