import type { BillStatus } from "@luraba/contracts/bills";
import { billOccurrencesTable, billsTable } from "@luraba/db/schemas/bills.schema";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  sql,
} from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { buildIlikeSearch, type DbListPage, getPagination } from "@/shared/list";
import {
  type DbExecutor,
  HouseholdScopedRepository,
} from "@/shared/repositories/household-scoped.repository";
import type { BillRecord, OccurrenceRecord } from "./bills.types";

export type CreateBillValues = Omit<
  typeof billsTable.$inferInsert,
  "id" | "householdId" | "createdAt" | "updatedAt"
>;
export type NewOccurrence = typeof billOccurrencesTable.$inferInsert;
type Executor = DbExecutor;

export type ListBillsQuery = {
  page: number;
  perPage: number;
  search?: string;
  status?: BillStatus;
  sort?: string;
  sortDirection: "asc" | "desc";
};

/** Occurrences that are neither paid nor skipped. */
const unresolved = and(isNull(billOccurrencesTable.paidAt), isNull(billOccurrencesTable.skippedAt));

export type BillStatsRow = {
  billId: string;
  totalCount: number;
  paidCount: number;
  skippedCount: number;
  overdueCount: number;
};

export type UpcomingBillRow = {
  occurrenceId: string;
  billId: string;
  name: string;
  dueDate: Date;
  expectedAmount: number;
  currencyCode: string;
  categoryId: string | null;
  merchantId: string | null;
  installmentNumber: number | null;
  installmentCount: number | null;
};

/**
 * Bills are household-scoped, so get/create/update/delete come from the base class.
 * Occurrences have no household column; they are reached through a bill the caller
 * already loaded with `get`, which is what proves the household.
 */
class BillsRepository extends HouseholdScopedRepository<BillRecord, CreateBillValues> {
  constructor() {
    super(billsTable, { orderBy: billsTable.name });
  }

  async listPage(
    context: HouseholdContext,
    query: ListBillsQuery,
  ): Promise<DbListPage<BillRecord>> {
    const where = and(
      eq(billsTable.householdId, context.householdId),
      query.status ? eq(billsTable.status, query.status) : undefined,
      buildIlikeSearch(query.search, [sql`${billsTable.name}`]),
    );
    const sortColumns = {
      name: billsTable.name,
      expectedAmount: billsTable.expectedAmount,
      createdAt: billsTable.createdAt,
    } as const;
    const sortColumn = sortColumns[query.sort as keyof typeof sortColumns] ?? billsTable.name;
    const orderBy = [
      query.sortDirection === "desc" ? desc(sortColumn) : asc(sortColumn),
      asc(billsTable.id),
    ];
    const { limit, offset } = getPagination(query);

    const [countRow, rows] = await Promise.all([
      db.select({ value: count() }).from(billsTable).where(where),
      db
        .select()
        .from(billsTable)
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
    ]);

    return { rows, totalCount: countRow[0]?.value ?? 0 };
  }

  async insertOccurrences(executor: Executor, rows: readonly NewOccurrence[]): Promise<void> {
    if (rows.length === 0) return;
    await executor
      .insert(billOccurrencesTable)
      .values([...rows])
      .onConflictDoNothing();
  }

  async getOccurrence(billId: string, occurrenceId: string): Promise<OccurrenceRecord | undefined> {
    const [row] = await db
      .select()
      .from(billOccurrencesTable)
      .where(
        and(eq(billOccurrencesTable.id, occurrenceId), eq(billOccurrencesTable.billId, billId)),
      )
      .limit(1);

    return row;
  }

  async updateOccurrence(
    occurrenceId: string,
    values: Partial<
      Pick<OccurrenceRecord, "expectedAmount" | "paidAt" | "skippedAt" | "transactionId">
    >,
  ): Promise<OccurrenceRecord> {
    const [row] = await db
      .update(billOccurrencesTable)
      .set({ ...values, updatedAt: sql`now()` })
      .where(eq(billOccurrencesTable.id, occurrenceId))
      .returning();
    if (!row) throw new Error("Failed to update occurrence");
    return row;
  }

  async listOccurrencesPage(
    billId: string,
    query: {
      page: number;
      perPage: number;
      from?: string;
      to?: string;
      state?: "scheduled" | "overdue" | "paid" | "skipped";
      sortDirection: "asc" | "desc";
    },
    today: string,
  ): Promise<DbListPage<OccurrenceRecord>> {
    const stateFilter = {
      paid: isNotNull(billOccurrencesTable.paidAt),
      skipped: isNotNull(billOccurrencesTable.skippedAt),
      scheduled: and(unresolved, gte(billOccurrencesTable.dueDate, sql`${today}::date`)),
      overdue: and(unresolved, lt(billOccurrencesTable.dueDate, sql`${today}::date`)),
    } as const;

    const where = and(
      eq(billOccurrencesTable.billId, billId),
      query.from ? gte(billOccurrencesTable.dueDate, sql`${query.from}::date`) : undefined,
      query.to ? lte(billOccurrencesTable.dueDate, sql`${query.to}::date`) : undefined,
      query.state ? stateFilter[query.state] : undefined,
    );
    const { limit, offset } = getPagination(query);
    const order = query.sortDirection === "desc" ? desc : asc;

    const [countRow, rows] = await Promise.all([
      db.select({ value: count() }).from(billOccurrencesTable).where(where),
      db
        .select()
        .from(billOccurrencesTable)
        .where(where)
        .orderBy(order(billOccurrencesTable.dueDate))
        .limit(limit)
        .offset(offset),
    ]);

    return { rows, totalCount: countRow[0]?.value ?? 0 };
  }

  /** Removes occurrences that still need action from `fromDate` on; history is never touched. */

  async deleteUnresolvedOccurrencesFrom(
    executor: Executor,
    billId: string,
    fromDate: string,
  ): Promise<void> {
    await executor
      .delete(billOccurrencesTable)
      .where(
        and(
          eq(billOccurrencesTable.billId, billId),
          unresolved,
          gte(billOccurrencesTable.dueDate, sql`${fromDate}::date`),
        ),
      );
  }

  async setUnresolvedAmountFrom(
    executor: Executor,
    billId: string,
    fromDate: string,
    expectedAmount: number,
  ): Promise<void> {
    await executor
      .update(billOccurrencesTable)
      .set({ expectedAmount, updatedAt: sql`now()` })
      .where(
        and(
          eq(billOccurrencesTable.billId, billId),
          unresolved,
          gte(billOccurrencesTable.dueDate, sql`${fromDate}::date`),
        ),
      );
  }

  async markFirstOccurrencesPaid(
    executor: Executor,
    billId: string,
    paidCount: number,
  ): Promise<void> {
    if (paidCount === 0) return;

    const firstIds = executor
      .select({ id: billOccurrencesTable.id })
      .from(billOccurrencesTable)
      .where(eq(billOccurrencesTable.billId, billId))
      .orderBy(asc(billOccurrencesTable.dueDate))
      .limit(paidCount);

    await executor
      .update(billOccurrencesTable)
      .set({ paidAt: sql`now()` })
      .where(inArray(billOccurrencesTable.id, firstIds));
  }

  async getBillStats(billIds: readonly string[], today: string): Promise<BillStatsRow[]> {
    if (billIds.length === 0) return [];

    return db
      .select({
        billId: billOccurrencesTable.billId,
        totalCount: sql<number>`count(*)::int`,
        paidCount: sql<number>`(count(*) filter (where ${billOccurrencesTable.paidAt} is not null))::int`,
        skippedCount: sql<number>`(count(*) filter (where ${billOccurrencesTable.skippedAt} is not null))::int`,
        overdueCount: sql<number>`(count(*) filter (where ${billOccurrencesTable.paidAt} is null and ${billOccurrencesTable.skippedAt} is null and ${billOccurrencesTable.dueDate} < ${today}::date))::int`,
      })
      .from(billOccurrencesTable)
      .where(inArray(billOccurrencesTable.billId, [...billIds]))
      .groupBy(billOccurrencesTable.billId);
  }

  /** The earliest occurrence of each bill that still needs action (overdue ones come first). */

  async getNextOccurrences(billIds: readonly string[]): Promise<OccurrenceRecord[]> {
    if (billIds.length === 0) return [];

    return db
      .selectDistinctOn([billOccurrencesTable.billId])
      .from(billOccurrencesTable)
      .where(and(inArray(billOccurrencesTable.billId, [...billIds]), unresolved))
      .orderBy(billOccurrencesTable.billId, asc(billOccurrencesTable.dueDate));
  }

  async listLinkedOccurrences(
    billIds: readonly string[],
  ): Promise<Array<Pick<OccurrenceRecord, "billId" | "transactionId" | "dueDate">>> {
    if (billIds.length === 0) return [];

    return db
      .select({
        billId: billOccurrencesTable.billId,
        transactionId: billOccurrencesTable.transactionId,
        dueDate: billOccurrencesTable.dueDate,
      })
      .from(billOccurrencesTable)
      .where(
        and(
          inArray(billOccurrencesTable.billId, [...billIds]),
          isNotNull(billOccurrencesTable.transactionId),
        ),
      );
  }

  async listForecastRows(context: HouseholdContext, from: string, to: string) {
    return db
      .select({
        occurrenceId: billOccurrencesTable.id,
        billId: billsTable.id,
        billName: billsTable.name,
        dueDate: billOccurrencesTable.dueDate,
        expectedAmount: billOccurrencesTable.expectedAmount,
        currencyCode: billsTable.currencyCode,
        paidAt: billOccurrencesTable.paidAt,
        skippedAt: billOccurrencesTable.skippedAt,
      })
      .from(billOccurrencesTable)
      .innerJoin(billsTable, eq(billsTable.id, billOccurrencesTable.billId))
      .where(
        and(
          eq(billsTable.householdId, context.householdId),
          eq(billsTable.status, "active"),
          gte(billOccurrencesTable.dueDate, sql`${from}::date`),
          lte(billOccurrencesTable.dueDate, sql`${to}::date`),
        ),
      )
      .orderBy(asc(billOccurrencesTable.dueDate), asc(billsTable.name));
  }

  /**
   * Unpaid occurrences of active bills due up to `toDate`, including overdue ones.
   * Occurrences dated before the bill was created are backfilled history, not debts.
   */

  async listUpcomingOccurrences(
    householdId: string,
    toDate: string,
    filters: {
      search?: string;
      categoryIds?: string[];
      merchantIds?: string[];
      currencyCodes?: string[];
      uncategorized?: boolean;
      amountMin?: number;
      amountMax?: number;
    },
  ): Promise<UpcomingBillRow[]> {
    const rows = await db
      .select({
        occurrenceId: billOccurrencesTable.id,
        billId: billsTable.id,
        name: billsTable.name,
        dueDate: billOccurrencesTable.dueDate,
        expectedAmount: billOccurrencesTable.expectedAmount,
        currencyCode: billsTable.currencyCode,
        categoryId: billsTable.categoryId,
        merchantId: billsTable.merchantId,
        installmentNumber: billOccurrencesTable.installmentNumber,
        installmentCount: billsTable.installmentCount,
      })
      .from(billOccurrencesTable)
      .innerJoin(billsTable, eq(billsTable.id, billOccurrencesTable.billId))
      .where(
        and(
          eq(billsTable.householdId, householdId),
          eq(billsTable.status, "active"),
          unresolved,
          lte(billOccurrencesTable.dueDate, sql`${toDate}::date`),
          gte(billOccurrencesTable.dueDate, sql`${billsTable.createdAt}::date`),
          buildIlikeSearch(filters.search, [sql`${billsTable.name}`]),
          filters.categoryIds?.length
            ? inArray(billsTable.categoryId, filters.categoryIds)
            : undefined,
          filters.merchantIds?.length
            ? inArray(billsTable.merchantId, filters.merchantIds)
            : undefined,
          filters.currencyCodes?.length
            ? inArray(billsTable.currencyCode, filters.currencyCodes)
            : undefined,
          filters.uncategorized ? isNull(billsTable.categoryId) : undefined,
          filters.amountMin !== undefined
            ? gte(billOccurrencesTable.expectedAmount, filters.amountMin)
            : undefined,
          filters.amountMax !== undefined
            ? lte(billOccurrencesTable.expectedAmount, filters.amountMax)
            : undefined,
        ),
      )
      .orderBy(asc(billOccurrencesTable.dueDate), asc(billOccurrencesTable.id));

    return rows;
  }
}

export const billsRepository = new BillsRepository();
