import type { SplitStatus } from "@luraba/contracts/splits";
import {
  splitInstallmentsTable,
  splitParticipantsTable,
  splitsTable,
} from "@luraba/db/schemas/splits.schema";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { buildIlikeSearch, type DbListPage, getPagination } from "@/shared/list";
import type { InstallmentRecord, ParticipantRecord, SplitRecord } from "./splits.types";

export type NewSplit = Omit<typeof splitsTable.$inferInsert, "id" | "createdAt" | "updatedAt">;
export type NewParticipant = typeof splitParticipantsTable.$inferInsert;
export type NewInstallment = typeof splitInstallmentsTable.$inferInsert;
type Executor = Pick<typeof db, "select" | "insert" | "update" | "delete">;

// ─── Splits ──────────────────────────────────────────────────────────────

export async function insertSplit(executor: Executor, values: NewSplit): Promise<SplitRecord> {
  const [row] = await executor.insert(splitsTable).values(values).returning();
  if (!row) throw new Error("Failed to create split");
  return row;
}

export async function getSplit(
  context: HouseholdContext,
  id: string,
): Promise<SplitRecord | undefined> {
  const [row] = await db
    .select()
    .from(splitsTable)
    .where(and(eq(splitsTable.id, id), eq(splitsTable.householdId, context.householdId)))
    .limit(1);

  return row;
}

export async function listSplitsPage(
  context: HouseholdContext,
  query: {
    page: number;
    perPage: number;
    search?: string;
    status?: SplitStatus;
    sort?: string;
    sortDirection: "asc" | "desc";
  },
): Promise<DbListPage<SplitRecord>> {
  const where = and(
    eq(splitsTable.householdId, context.householdId),
    query.status ? eq(splitsTable.status, query.status) : undefined,
    buildIlikeSearch(query.search, [sql`${splitsTable.title}`]),
  );
  const sortColumn = query.sort === "title" ? splitsTable.title : splitsTable.createdAt;
  const direction = query.sort === "title" ? query.sortDirection : "desc";
  const orderBy = [direction === "desc" ? desc(sortColumn) : asc(sortColumn), asc(splitsTable.id)];
  const { limit, offset } = getPagination(query);

  const [countRow, rows] = await Promise.all([
    db.select({ value: count() }).from(splitsTable).where(where),
    db
      .select()
      .from(splitsTable)
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
  ]);

  return { rows, totalCount: countRow[0]?.value ?? 0 };
}

export async function updateSplit(id: string, values: Partial<NewSplit>): Promise<SplitRecord> {
  const [row] = await db
    .update(splitsTable)
    .set({ ...values, updatedAt: sql`now()` })
    .where(eq(splitsTable.id, id))
    .returning();
  if (!row) throw new Error("Failed to update split");
  return row;
}

export async function deleteSplit(id: string): Promise<void> {
  await db.delete(splitsTable).where(eq(splitsTable.id, id));
}

// ─── Participants ────────────────────────────────────────────────────────

export async function insertParticipant(
  executor: Executor,
  values: NewParticipant,
): Promise<ParticipantRecord> {
  const [row] = await executor.insert(splitParticipantsTable).values(values).returning();
  if (!row) throw new Error("Failed to add participant");
  return row;
}

export async function getParticipant(
  splitId: string,
  participantId: string,
): Promise<ParticipantRecord | undefined> {
  const [row] = await db
    .select()
    .from(splitParticipantsTable)
    .where(
      and(
        eq(splitParticipantsTable.id, participantId),
        eq(splitParticipantsTable.splitId, splitId),
      ),
    )
    .limit(1);

  return row;
}

export async function listParticipants(splitIds: readonly string[]): Promise<ParticipantRecord[]> {
  if (splitIds.length === 0) return [];
  return db
    .select()
    .from(splitParticipantsTable)
    .where(inArray(splitParticipantsTable.splitId, [...splitIds]))
    .orderBy(asc(splitParticipantsTable.createdAt), asc(splitParticipantsTable.id));
}

export async function updateParticipant(
  participantId: string,
  values: Partial<Pick<ParticipantRecord, "name" | "notes">>,
): Promise<void> {
  await db
    .update(splitParticipantsTable)
    .set(values)
    .where(eq(splitParticipantsTable.id, participantId));
}

export async function deleteParticipant(participantId: string): Promise<void> {
  await db.delete(splitParticipantsTable).where(eq(splitParticipantsTable.id, participantId));
}

// ─── Installments ────────────────────────────────────────────────────────

export async function insertInstallments(
  executor: Executor,
  rows: readonly NewInstallment[],
): Promise<void> {
  if (rows.length === 0) return;
  await executor.insert(splitInstallmentsTable).values([...rows]);
}

export async function listInstallments(
  participantIds: readonly string[],
): Promise<InstallmentRecord[]> {
  if (participantIds.length === 0) return [];
  return db
    .select()
    .from(splitInstallmentsTable)
    .where(inArray(splitInstallmentsTable.participantId, [...participantIds]))
    .orderBy(asc(splitInstallmentsTable.dueDate), asc(splitInstallmentsTable.id));
}

/** Looks the installment up through its participant so it must belong to the given split. */
export async function getInstallment(
  splitId: string,
  installmentId: string,
): Promise<InstallmentRecord | undefined> {
  const [row] = await db
    .select({ installment: splitInstallmentsTable })
    .from(splitInstallmentsTable)
    .innerJoin(
      splitParticipantsTable,
      eq(splitParticipantsTable.id, splitInstallmentsTable.participantId),
    )
    .where(
      and(
        eq(splitInstallmentsTable.id, installmentId),
        eq(splitParticipantsTable.splitId, splitId),
      ),
    )
    .limit(1);

  return row?.installment;
}

export async function updateInstallment(
  installmentId: string,
  values: Partial<
    Pick<
      InstallmentRecord,
      | "dueDate"
      | "graceUntil"
      | "expectedAmount"
      | "receivedAt"
      | "skippedAt"
      | "writtenOffAt"
      | "transactionId"
    >
  >,
): Promise<InstallmentRecord> {
  const [row] = await db
    .update(splitInstallmentsTable)
    .set({ ...values, updatedAt: sql`now()` })
    .where(eq(splitInstallmentsTable.id, installmentId))
    .returning();
  if (!row) throw new Error("Failed to update installment");
  return row;
}

export async function deleteInstallment(installmentId: string): Promise<void> {
  await db.delete(splitInstallmentsTable).where(eq(splitInstallmentsTable.id, installmentId));
}
