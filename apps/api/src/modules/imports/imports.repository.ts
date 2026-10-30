import {
  importBatchesTable,
  importMappingsTable,
  importRecordsTable,
  importRowsTable,
  importTemplatesTable,
} from "@luraba/db/schemas/imports.schema";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { HouseholdScopedRepository } from "@/shared/repositories/household-scoped.repository";
import type {
  ImportBatchRecord,
  ImportMappingRecord,
  ImportRecordRecord,
  ImportRowRecord,
  ImportTemplateRecord,
} from "./imports.types";

class ImportBatchesRepository extends HouseholdScopedRepository<
  ImportBatchRecord,
  typeof importBatchesTable.$inferInsert
> {
  constructor() {
    super(importBatchesTable);
  }

  async listPage(context: HouseholdContext, page: number, perPage: number) {
    const where = eq(importBatchesTable.householdId, context.householdId);
    const [rows, [count]] = await Promise.all([
      db
        .select()
        .from(importBatchesTable)
        .where(where)
        .orderBy(desc(importBatchesTable.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage),
      db
        .select({ total: sql<number>`count(*)`.mapWith(Number) })
        .from(importBatchesTable)
        .where(where),
    ]);
    return { rows, total: count?.total ?? 0 };
  }
}

export const importBatchesRepository = new ImportBatchesRepository();

class ImportMappingsRepository extends HouseholdScopedRepository<
  ImportMappingRecord,
  typeof importMappingsTable.$inferInsert
> {
  constructor() {
    super(importMappingsTable);
  }

  async findByKey(context: HouseholdContext, sourceKey: string) {
    const rows = await db
      .select()
      .from(importMappingsTable)
      .where(
        and(
          eq(importMappingsTable.householdId, context.householdId),
          eq(importMappingsTable.sourceKey, sourceKey),
        ),
      );
    return rows[0];
  }

  async upsert(
    context: HouseholdContext,
    values: Omit<typeof importMappingsTable.$inferInsert, "householdId">,
  ) {
    const rows = await db
      .insert(importMappingsTable)
      .values({ ...values, householdId: context.householdId })
      .onConflictDoUpdate({
        target: [importMappingsTable.householdId, importMappingsTable.sourceKey],
        set: { ...values, updatedAt: new Date() },
      })
      .returning();
    return rows[0] as ImportMappingRecord;
  }
}

export const importMappingsRepository = new ImportMappingsRepository();

class ImportTemplatesRepository extends HouseholdScopedRepository<
  ImportTemplateRecord,
  typeof importTemplatesTable.$inferInsert
> {
  constructor() {
    super(importTemplatesTable);
  }

  async findForTarget(context: HouseholdContext, targetType: string, targetId: string) {
    const rows = await db
      .select()
      .from(importTemplatesTable)
      .where(
        and(
          eq(importTemplatesTable.householdId, context.householdId),
          eq(importTemplatesTable.targetType, targetType),
          eq(importTemplatesTable.targetId, targetId),
        ),
      );
    return rows[0];
  }

  /** One template per account or card: saving again replaces it. */
  async upsert(
    context: HouseholdContext,
    values: Omit<typeof importTemplatesTable.$inferInsert, "householdId">,
  ) {
    await db
      .insert(importTemplatesTable)
      .values({ ...values, householdId: context.householdId })
      .onConflictDoUpdate({
        target: [
          importTemplatesTable.householdId,
          importTemplatesTable.targetType,
          importTemplatesTable.targetId,
        ],
        set: {
          headerSignature: values.headerSignature,
          mapping: values.mapping,
          updatedAt: new Date(),
        },
      });
  }
}

export const importTemplatesRepository = new ImportTemplatesRepository();

/** The idempotency ledger. Has a household column, so it is scoped like any other table. */
class ImportRecordsRepository extends HouseholdScopedRepository<
  ImportRecordRecord,
  typeof importRecordsTable.$inferInsert
> {
  constructor() {
    super(importRecordsTable);
  }

  async listForTarget(context: HouseholdContext, targetType: string, targetId: string) {
    return db
      .select({
        externalId: importRecordsTable.externalId,
        fingerprint: importRecordsTable.fingerprint,
        seriesKey: importRecordsTable.seriesKey,
      })
      .from(importRecordsTable)
      .where(
        and(
          eq(importRecordsTable.householdId, context.householdId),
          eq(importRecordsTable.targetType, targetType),
          eq(importRecordsTable.targetId, targetId),
        ),
      );
  }

  async listPairKeys(context: HouseholdContext): Promise<Set<string>> {
    const rows = await db
      .select({ pairKey: importRecordsTable.pairKey })
      .from(importRecordsTable)
      .where(
        and(
          eq(importRecordsTable.householdId, context.householdId),
          isNotNull(importRecordsTable.pairKey),
        ),
      );
    return new Set(rows.flatMap((row) => (row.pairKey ? [row.pairKey] : [])));
  }

  async findMatch(
    context: HouseholdContext,
    targetType: string,
    targetId: string,
    keys: {
      externalId?: string | null;
      fingerprint?: string | null;
      seriesKey?: string | null;
      pairKey?: string | null;
    },
  ) {
    const conditions = [
      keys.externalId ? eq(importRecordsTable.externalId, keys.externalId) : undefined,
      keys.fingerprint ? eq(importRecordsTable.fingerprint, keys.fingerprint) : undefined,
      keys.seriesKey ? eq(importRecordsTable.seriesKey, keys.seriesKey) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);
    const scoped = conditions.length
      ? and(
          eq(importRecordsTable.targetType, targetType),
          eq(importRecordsTable.targetId, targetId),
          sql`(${sql.join(conditions, sql` or `)})`,
        )
      : undefined;
    const pair = keys.pairKey ? eq(importRecordsTable.pairKey, keys.pairKey) : undefined;
    const either = scoped && pair ? sql`(${scoped} or ${pair})` : (scoped ?? pair);
    if (!either) return undefined;
    const rows = await db
      .select()
      .from(importRecordsTable)
      .where(and(eq(importRecordsTable.householdId, context.householdId), either))
      .limit(1);
    return rows[0];
  }
}

export const importRecordsRepository = new ImportRecordsRepository();

/**
 * Staged rows have no household column: they are always reached through a batch that was loaded
 * with `importBatchesRepository.get(id, context)`, which is what proves the household.
 */
export const importRowsRepository = {
  async insertMany(rows: Array<typeof importRowsTable.$inferInsert>) {
    for (let i = 0; i < rows.length; i += 500) {
      await db.insert(importRowsTable).values(rows.slice(i, i + 500));
    }
  },

  /** Drops every staged row of a draft batch (the column mapping changed and rows are rebuilt). */
  async deleteAll(batchId: string) {
    await db.delete(importRowsTable).where(eq(importRowsTable.batchId, batchId));
  },

  async listAll(batchId: string): Promise<ImportRowRecord[]> {
    return db
      .select()
      .from(importRowsTable)
      .where(eq(importRowsTable.batchId, batchId))
      .orderBy(asc(importRowsTable.rowIndex));
  },

  async get(batchId: string, rowId: string): Promise<ImportRowRecord | undefined> {
    const rows = await db
      .select()
      .from(importRowsTable)
      .where(and(eq(importRowsTable.batchId, batchId), eq(importRowsTable.id, rowId)));
    return rows[0];
  },

  async updateMany(
    batchId: string,
    rowIds: string[],
    values: Partial<typeof importRowsTable.$inferInsert>,
  ) {
    for (let i = 0; i < rowIds.length; i += 1000) {
      await db
        .update(importRowsTable)
        .set(values)
        .where(
          and(
            eq(importRowsTable.batchId, batchId),
            inArray(importRowsTable.id, rowIds.slice(i, i + 1000)),
          ),
        );
    }
  },

  /** Writes the evaluation of many rows with one statement per chunk. */
  async saveEvaluations(
    batchId: string,
    updates: Array<{
      id: string;
      kind: string | null;
      issues: unknown;
      hints?: unknown;
      skip?: boolean;
    }>,
  ) {
    for (let i = 0; i < updates.length; i += 400) {
      const chunk = updates.slice(i, i + 400);
      const values = sql.join(
        chunk.map(
          (u) =>
            sql`(${u.id}::uuid, ${u.kind}::varchar, ${JSON.stringify(u.issues)}::jsonb, ${u.hints === undefined ? null : JSON.stringify(u.hints)}::jsonb, ${u.skip ?? null}::boolean)`,
        ),
        sql`, `,
      );
      await db.execute(sql`
        update import_rows as r set
          kind = v.kind,
          issues = v.issues,
          hints = coalesce(v.hints, r.hints),
          skip = coalesce(v.skip, r.skip)
        from (values ${values}) as v(id, kind, issues, hints, skip)
        where r.id = v.id and r.batch_id = ${batchId}::uuid
      `);
    }
  },

  async setOutcome(
    rowId: string,
    outcome: "created" | "duplicate" | "skipped" | "failed",
    message: string | null,
    transactionId?: string | null,
  ) {
    await db
      .update(importRowsTable)
      .set({ outcome, outcomeMessage: message, createdTransactionId: transactionId ?? null })
      .where(eq(importRowsTable.id, rowId));
  },

  async outcomeCounts(batchId: string): Promise<Record<string, number>> {
    const rows = await db
      .select({
        outcome: importRowsTable.outcome,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(importRowsTable)
      .where(eq(importRowsTable.batchId, batchId))
      .groupBy(importRowsTable.outcome);
    return Object.fromEntries(rows.map((row) => [row.outcome ?? "pending", row.count]));
  },
};
