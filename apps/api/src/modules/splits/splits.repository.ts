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
import {
  type DbExecutor,
  HouseholdScopedRepository,
} from "@/shared/repositories/household-scoped.repository";
import type { InstallmentRecord, ParticipantRecord, SplitRecord } from "./splits.types";

export type CreateSplitValues = Omit<
  typeof splitsTable.$inferInsert,
  "id" | "householdId" | "createdAt" | "updatedAt"
>;
export type NewParticipant = typeof splitParticipantsTable.$inferInsert;
export type NewInstallment = typeof splitInstallmentsTable.$inferInsert;
type Executor = DbExecutor;

/**
 * Splits are household-scoped, so get/create/update/delete come from the base class.
 * Participants and installments have no household column; reach them through a split
 * the caller already loaded with `get`, which is what proves the household.
 */
class SplitsRepository extends HouseholdScopedRepository<SplitRecord, CreateSplitValues> {
  constructor() {
    super(splitsTable, { orderBy: splitsTable.createdAt });
  }

  async listPage(
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
    const orderBy = [
      direction === "desc" ? desc(sortColumn) : asc(sortColumn),
      asc(splitsTable.id),
    ];
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

  async insertParticipant(executor: Executor, values: NewParticipant): Promise<ParticipantRecord> {
    const [row] = await executor.insert(splitParticipantsTable).values(values).returning();
    if (!row) throw new Error("Failed to add participant");
    return row;
  }

  async getParticipant(
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

  async listParticipants(splitIds: readonly string[]): Promise<ParticipantRecord[]> {
    if (splitIds.length === 0) return [];
    return db
      .select()
      .from(splitParticipantsTable)
      .where(inArray(splitParticipantsTable.splitId, [...splitIds]))
      .orderBy(asc(splitParticipantsTable.createdAt), asc(splitParticipantsTable.id));
  }

  async updateParticipant(
    participantId: string,
    values: Partial<Pick<ParticipantRecord, "name" | "notes">>,
  ): Promise<void> {
    await db
      .update(splitParticipantsTable)
      .set(values)
      .where(eq(splitParticipantsTable.id, participantId));
  }

  async deleteParticipant(participantId: string): Promise<void> {
    await db.delete(splitParticipantsTable).where(eq(splitParticipantsTable.id, participantId));
  }

  async insertInstallments(executor: Executor, rows: readonly NewInstallment[]): Promise<void> {
    if (rows.length === 0) return;
    await executor.insert(splitInstallmentsTable).values([...rows]);
  }

  async listInstallments(participantIds: readonly string[]): Promise<InstallmentRecord[]> {
    if (participantIds.length === 0) return [];
    return db
      .select()
      .from(splitInstallmentsTable)
      .where(inArray(splitInstallmentsTable.participantId, [...participantIds]))
      .orderBy(asc(splitInstallmentsTable.dueDate), asc(splitInstallmentsTable.id));
  }

  /** Looks the installment up through its participant so it must belong to the given split. */

  async getInstallment(
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

  async updateInstallment(
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

  async deleteInstallment(installmentId: string): Promise<void> {
    await db.delete(splitInstallmentsTable).where(eq(splitInstallmentsTable.id, installmentId));
  }
}

export const splitsRepository = new SplitsRepository();
