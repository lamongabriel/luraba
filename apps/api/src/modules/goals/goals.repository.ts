import type { GoalKind, GoalStatus } from "@luraba/contracts/goals";
import { goalContributionsTable, goalsTable } from "@luraba/db/schemas/goals.schema";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { buildIlikeSearch, type DbListPage, getPagination } from "@/shared/list";
import { HouseholdScopedRepository } from "@/shared/repositories/household-scoped.repository";
import type { GoalContributionRecord, GoalRecord } from "./goals.types";

export type CreateGoalValues = Omit<
  typeof goalsTable.$inferInsert,
  "id" | "householdId" | "createdAt" | "updatedAt"
>;
export type NewContribution = Omit<
  typeof goalContributionsTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type ContributionChanges = Partial<
  Pick<GoalContributionRecord, "amount" | "contributedOn" | "note" | "transactionId">
>;

/**
 * Goals are household-scoped, so get/create/update/delete come from the base class.
 * Contributions have no household column; reach them through a goal the caller already
 * loaded with `get`, which is what proves the household.
 */
class GoalsRepository extends HouseholdScopedRepository<GoalRecord, CreateGoalValues> {
  constructor() {
    super(goalsTable, { orderBy: goalsTable.createdAt });
  }

  async listPage(
    context: HouseholdContext,
    query: {
      page: number;
      perPage: number;
      search?: string;
      status?: GoalStatus;
      kind?: GoalKind;
      sort?: string;
      sortDirection: "asc" | "desc";
    },
  ): Promise<DbListPage<GoalRecord>> {
    const where = and(
      eq(goalsTable.householdId, context.householdId),
      query.status ? eq(goalsTable.status, query.status) : undefined,
      query.kind ? eq(goalsTable.kind, query.kind) : undefined,
      buildIlikeSearch(query.search, [sql`${goalsTable.name}`]),
    );
    const sortColumns = {
      name: goalsTable.name,
      targetDate: goalsTable.targetDate,
      createdAt: goalsTable.createdAt,
    } as const;
    const sortColumn = sortColumns[query.sort as keyof typeof sortColumns] ?? goalsTable.createdAt;
    const direction = query.sort ? query.sortDirection : "desc";
    const { limit, offset } = getPagination(query);

    const [countRow, rows] = await Promise.all([
      db.select({ value: count() }).from(goalsTable).where(where),
      db
        .select()
        .from(goalsTable)
        .where(where)
        .orderBy(direction === "desc" ? desc(sortColumn) : asc(sortColumn), asc(goalsTable.id))
        .limit(limit)
        .offset(offset),
    ]);

    return { rows, totalCount: countRow[0]?.value ?? 0 };
  }

  async listContributions(goalIds: readonly string[]): Promise<GoalContributionRecord[]> {
    if (goalIds.length === 0) return [];
    return db
      .select()
      .from(goalContributionsTable)
      .where(inArray(goalContributionsTable.goalId, [...goalIds]))
      .orderBy(
        asc(goalContributionsTable.contributedOn),
        asc(goalContributionsTable.createdAt),
        asc(goalContributionsTable.id),
      );
  }

  async getContribution(
    goalId: string,
    contributionId: string,
  ): Promise<GoalContributionRecord | undefined> {
    const [row] = await db
      .select()
      .from(goalContributionsTable)
      .where(
        and(
          eq(goalContributionsTable.id, contributionId),
          eq(goalContributionsTable.goalId, goalId),
        ),
      )
      .limit(1);
    return row;
  }

  async insertContribution(values: NewContribution): Promise<GoalContributionRecord> {
    const [row] = await db.insert(goalContributionsTable).values(values).returning();
    if (!row) throw new Error("Failed to add contribution");
    return row;
  }

  async updateContribution(
    contributionId: string,
    values: ContributionChanges,
  ): Promise<GoalContributionRecord> {
    const [row] = await db
      .update(goalContributionsTable)
      .set({ ...values, updatedAt: sql`now()` })
      .where(eq(goalContributionsTable.id, contributionId))
      .returning();
    if (!row) throw new Error("Failed to update contribution");
    return row;
  }

  async deleteContribution(contributionId: string): Promise<void> {
    await db.delete(goalContributionsTable).where(eq(goalContributionsTable.id, contributionId));
  }
}

export const goalsRepository = new GoalsRepository();
