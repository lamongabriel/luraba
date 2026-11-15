import { accountsTable } from "@luraba/db/schemas/accounts.schema";
import {
  goalPiggyBanksTable,
  piggyBankAccrualsTable,
  piggyBankMovementsTable,
  piggyBanksTable,
} from "@luraba/db/schemas/piggy-banks.schema";
import { and, asc, desc, eq, gte, inArray, isNull, lt, lte, sql } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import type { TxClient } from "@/db/types";
import { HouseholdScopedRepository } from "@/shared/repositories/household-scoped.repository";
import type {
  GoalPiggyBankRecord,
  PiggyBankAccrualRecord,
  PiggyBankMovementRecord,
  PiggyBankRecord,
} from "./piggy-banks.types";

export type CreatePiggyBankValues = Omit<
  typeof piggyBanksTable.$inferInsert,
  "id" | "householdId" | "createdAt" | "updatedAt"
>;
export type NewMovement = Omit<typeof piggyBankMovementsTable.$inferInsert, "id" | "createdAt">;

type Executor = Pick<typeof db, "select" | "insert" | "update" | "delete">;

/**
 * Piggy banks are household-scoped. Movements, accruals and goal links have no household column:
 * reach them with ids of piggy banks already loaded through `get`/`listByHousehold`, which is what
 * proves the household.
 */
class PiggyBanksRepository extends HouseholdScopedRepository<
  PiggyBankRecord,
  CreatePiggyBankValues
> {
  constructor() {
    super(piggyBanksTable, { orderBy: piggyBanksTable.title });
  }

  async listByHousehold(
    context: HouseholdContext,
    filter: { parentAccountId?: string; piggyBankIds?: string[]; includeArchived?: boolean },
  ): Promise<(PiggyBankRecord & { parentAccountName: string })[]> {
    if (filter.piggyBankIds && filter.piggyBankIds.length === 0) return [];
    const rows = await db
      .select({ piggy: piggyBanksTable, parentAccountName: accountsTable.name })
      .from(piggyBanksTable)
      .innerJoin(accountsTable, eq(accountsTable.id, piggyBanksTable.parentAccountId))
      .where(
        and(
          eq(piggyBanksTable.householdId, context.householdId),
          filter.parentAccountId
            ? eq(piggyBanksTable.parentAccountId, filter.parentAccountId)
            : undefined,
          filter.piggyBankIds ? inArray(piggyBanksTable.id, filter.piggyBankIds) : undefined,
          filter.includeArchived ? undefined : isNull(piggyBanksTable.archivedAt),
        ),
      )
      .orderBy(asc(piggyBanksTable.title), asc(piggyBanksTable.id));
    return rows.map((row) => ({ ...row.piggy, parentAccountName: row.parentAccountName }));
  }

  /** Active piggy banks of every household that earn interest, for the daily job. */
  async listAccruing(): Promise<PiggyBankRecord[]> {
    return db
      .select()
      .from(piggyBanksTable)
      .where(and(isNull(piggyBanksTable.archivedAt), sql`${piggyBanksTable.yieldType} <> 'none'`))
      .orderBy(asc(piggyBanksTable.createdAt), asc(piggyBanksTable.id));
  }

  async setArchivedAt(
    context: HouseholdContext,
    id: string,
    archivedAt: Date | null,
  ): Promise<PiggyBankRecord | undefined> {
    return this.update(id, context, { archivedAt });
  }

  async setAccruedThrough(tx: Executor, id: string, day: Date): Promise<void> {
    await tx.update(piggyBanksTable).set({ accruedThrough: day }).where(eq(piggyBanksTable.id, id));
  }

  // ── Movements ──

  async insertMovements(tx: Executor, rows: NewMovement[]): Promise<PiggyBankMovementRecord[]> {
    if (rows.length === 0) return [];
    return tx.insert(piggyBankMovementsTable).values(rows).returning();
  }

  async balances(
    piggyBankIds: readonly string[],
    executor: Executor = db,
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>(piggyBankIds.map((id) => [id, 0]));
    if (piggyBankIds.length === 0) return result;
    const rows = await executor
      .select({
        id: piggyBankMovementsTable.piggyBankId,
        balance: sql<number>`coalesce(sum(${piggyBankMovementsTable.amount}), 0)`.mapWith(Number),
      })
      .from(piggyBankMovementsTable)
      .where(inArray(piggyBankMovementsTable.piggyBankId, [...piggyBankIds]))
      .groupBy(piggyBankMovementsTable.piggyBankId);
    for (const row of rows) result.set(row.id, row.balance);
    return result;
  }

  /** Sum of movements of the given kinds per piggy bank, optionally within `[from, to]`. */
  async sumByKinds(
    piggyBankIds: readonly string[],
    kinds: readonly string[],
    range: { from?: Date; to?: Date } = {},
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>(piggyBankIds.map((id) => [id, 0]));
    if (piggyBankIds.length === 0) return result;
    const rows = await db
      .select({
        id: piggyBankMovementsTable.piggyBankId,
        total: sql<number>`coalesce(sum(${piggyBankMovementsTable.amount}), 0)`.mapWith(Number),
      })
      .from(piggyBankMovementsTable)
      .where(
        and(
          inArray(piggyBankMovementsTable.piggyBankId, [...piggyBankIds]),
          inArray(piggyBankMovementsTable.kind, [...kinds]),
          range.from ? gte(piggyBankMovementsTable.occurredOn, range.from) : undefined,
          range.to ? lte(piggyBankMovementsTable.occurredOn, range.to) : undefined,
        ),
      )
      .groupBy(piggyBankMovementsTable.piggyBankId);
    for (const row of rows) result.set(row.id, row.total);
    return result;
  }

  /** Net flows by piggy bank and month (`YYYY-MM`), for kinds that are money in or out. */
  async monthlyFlows(
    piggyBankIds: readonly string[],
    kinds: readonly string[],
    from: Date,
  ): Promise<{ piggyBankId: string; month: string; total: number }[]> {
    if (piggyBankIds.length === 0) return [];
    return db
      .select({
        piggyBankId: piggyBankMovementsTable.piggyBankId,
        month: sql<string>`to_char(${piggyBankMovementsTable.occurredOn}, 'YYYY-MM')`,
        total: sql<number>`sum(${piggyBankMovementsTable.amount})`.mapWith(Number),
      })
      .from(piggyBankMovementsTable)
      .where(
        and(
          inArray(piggyBankMovementsTable.piggyBankId, [...piggyBankIds]),
          inArray(piggyBankMovementsTable.kind, [...kinds]),
          gte(piggyBankMovementsTable.occurredOn, from),
        ),
      )
      .groupBy(
        piggyBankMovementsTable.piggyBankId,
        sql`to_char(${piggyBankMovementsTable.occurredOn}, 'YYYY-MM')`,
      );
  }

  /** Principal movements (lots) of one piggy bank, oldest first. */
  async principalMovements(
    piggyBankId: string,
    kinds: readonly string[],
  ): Promise<PiggyBankMovementRecord[]> {
    return db
      .select()
      .from(piggyBankMovementsTable)
      .where(
        and(
          eq(piggyBankMovementsTable.piggyBankId, piggyBankId),
          inArray(piggyBankMovementsTable.kind, [...kinds]),
        ),
      )
      .orderBy(asc(piggyBankMovementsTable.occurredOn), asc(piggyBankMovementsTable.createdAt));
  }

  async listMovements(
    piggyBankId: string,
    options: { kind?: string; limit: number; offset: number },
  ): Promise<{
    rows: (PiggyBankMovementRecord & { counterpartTitle: string | null })[];
    total: number;
  }> {
    const where = and(
      eq(piggyBankMovementsTable.piggyBankId, piggyBankId),
      options.kind ? eq(piggyBankMovementsTable.kind, options.kind) : undefined,
    );
    const counterpart = db
      .select({ id: piggyBanksTable.id, title: piggyBanksTable.title })
      .from(piggyBanksTable)
      .as("counterpart");
    const [rows, totalRow] = await Promise.all([
      db
        .select({ movement: piggyBankMovementsTable, counterpartTitle: counterpart.title })
        .from(piggyBankMovementsTable)
        .leftJoin(counterpart, eq(counterpart.id, piggyBankMovementsTable.counterpartPiggyBankId))
        .where(where)
        .orderBy(
          desc(piggyBankMovementsTable.occurredOn),
          desc(piggyBankMovementsTable.createdAt),
          desc(piggyBankMovementsTable.id),
        )
        .limit(options.limit)
        .offset(options.offset),
      db
        .select({ value: sql<number>`count(*)`.mapWith(Number) })
        .from(piggyBankMovementsTable)
        .where(where),
    ]);
    return {
      rows: rows.map((row) => ({ ...row.movement, counterpartTitle: row.counterpartTitle })),
      total: totalRow[0]?.value ?? 0,
    };
  }

  async firstMovementDate(piggyBankId: string, executor: Executor = db): Promise<Date | null> {
    const [row] = await executor
      .select({ value: sql<Date | null>`min(${piggyBankMovementsTable.occurredOn})` })
      .from(piggyBankMovementsTable)
      .where(eq(piggyBankMovementsTable.piggyBankId, piggyBankId));
    return row?.value ? new Date(row.value) : null;
  }

  async confirmEstimatedInterest(tx: Executor, piggyBankId: string, through: Date): Promise<void> {
    await tx
      .update(piggyBankMovementsTable)
      .set({ estimated: false })
      .where(
        and(
          eq(piggyBankMovementsTable.piggyBankId, piggyBankId),
          eq(piggyBankMovementsTable.kind, "interest"),
          lte(piggyBankMovementsTable.occurredOn, through),
        ),
      );
  }

  // ── Accruals ──

  async getAccrual(
    piggyBankId: string,
    day: Date,
    executor: Executor = db,
  ): Promise<PiggyBankAccrualRecord | undefined> {
    const [row] = await executor
      .select()
      .from(piggyBankAccrualsTable)
      .where(
        and(
          eq(piggyBankAccrualsTable.piggyBankId, piggyBankId),
          eq(piggyBankAccrualsTable.accrualDate, day),
        ),
      );
    return row;
  }

  async lastAccrualBefore(
    piggyBankId: string,
    day: Date,
    executor: Executor = db,
  ): Promise<PiggyBankAccrualRecord | undefined> {
    const [row] = await executor
      .select()
      .from(piggyBankAccrualsTable)
      .where(
        and(
          eq(piggyBankAccrualsTable.piggyBankId, piggyBankId),
          lt(piggyBankAccrualsTable.accrualDate, day),
        ),
      )
      .orderBy(desc(piggyBankAccrualsTable.accrualDate))
      .limit(1);
    return row;
  }

  /** Returns false when the day was already accrued (the primary key made the insert a no-op). */
  async insertAccrual(
    tx: Executor,
    values: typeof piggyBankAccrualsTable.$inferInsert,
  ): Promise<boolean> {
    const rows = await tx
      .insert(piggyBankAccrualsTable)
      .values(values)
      .onConflictDoNothing()
      .returning({ id: piggyBankAccrualsTable.piggyBankId });
    return rows.length > 0;
  }

  /** The carry reset after the owner confirms a real balance. */
  async resetCarry(tx: Executor, piggyBankId: string, through: Date): Promise<void> {
    await tx
      .update(piggyBankAccrualsTable)
      .set({ carryOut: "0" })
      .where(
        and(
          eq(piggyBankAccrualsTable.piggyBankId, piggyBankId),
          eq(piggyBankAccrualsTable.accrualDate, through),
        ),
      );
  }

  // ── Goal links ──

  async goalLinks(goalIds: readonly string[]): Promise<GoalPiggyBankRecord[]> {
    if (goalIds.length === 0) return [];
    return db
      .select()
      .from(goalPiggyBanksTable)
      .where(inArray(goalPiggyBanksTable.goalId, [...goalIds]));
  }

  async linksForPiggyBanks(piggyBankIds: readonly string[]): Promise<GoalPiggyBankRecord[]> {
    if (piggyBankIds.length === 0) return [];
    return db
      .select()
      .from(goalPiggyBanksTable)
      .where(inArray(goalPiggyBanksTable.piggyBankId, [...piggyBankIds]));
  }

  async replaceGoalLinks(goalId: string, piggyBankIds: readonly string[]): Promise<void> {
    await db.transaction(async (tx: TxClient) => {
      await tx.delete(goalPiggyBanksTable).where(eq(goalPiggyBanksTable.goalId, goalId));
      if (piggyBankIds.length > 0) {
        await tx
          .insert(goalPiggyBanksTable)
          .values(piggyBankIds.map((piggyBankId) => ({ goalId, piggyBankId })));
      }
    });
  }
}

export const piggyBanksRepository = new PiggyBanksRepository();
