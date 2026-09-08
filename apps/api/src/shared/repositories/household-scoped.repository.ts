import { and, asc, eq } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { now as _now } from "@/shared/lib/date";

type HouseholdScopedTable = PgTable & {
  id: PgColumn;
  householdId: PgColumn;
  createdAt?: PgColumn;
  updatedAt?: PgColumn;
};

type RepositoryOptions = {
  orderBy?: PgColumn;
};

type MutationValues = Record<string, unknown>;

export abstract class HouseholdScopedRepository<
  TRecord,
  TCreateValues extends MutationValues = MutationValues,
  TUpdateValues extends MutationValues = Partial<TCreateValues>,
> {
  protected constructor(
    private readonly table: HouseholdScopedTable,
    private readonly options: RepositoryOptions = {},
  ) {}

  async list(context: HouseholdContext): Promise<TRecord[]> {
    const query = db
      .select()
      .from(this.table)
      .where(eq(this.table.householdId, context.householdId));

    if (this.options.orderBy) {
      return query.orderBy(asc(this.options.orderBy)) as Promise<TRecord[]>;
    }

    return query as Promise<TRecord[]>;
  }

  async get(id: string, context: HouseholdContext): Promise<TRecord | undefined> {
    const rows = await db
      .select()
      .from(this.table)
      .where(and(eq(this.table.id, id), eq(this.table.householdId, context.householdId)));

    return rows[0] as TRecord | undefined;
  }

  async create(context: HouseholdContext, values: TCreateValues): Promise<TRecord> {
    const rows = await db
      .insert(this.table)
      .values(this.withCreateDefaults(context, values))
      .returning();
    return rows[0] as TRecord;
  }

  async update(
    id: string,
    context: HouseholdContext,
    values: TUpdateValues,
  ): Promise<TRecord | undefined> {
    const rows = await db
      .update(this.table)
      .set(this.withUpdateTimestamp(values))
      .where(and(eq(this.table.id, id), eq(this.table.householdId, context.householdId)))
      .returning();

    return rows[0] as TRecord | undefined;
  }

  async delete(id: string, context: HouseholdContext): Promise<TRecord | undefined> {
    const rows = await db
      .delete(this.table)
      .where(and(eq(this.table.id, id), eq(this.table.householdId, context.householdId)))
      .returning();

    return rows[0] as TRecord | undefined;
  }

  private withCreateDefaults(context: HouseholdContext, values: TCreateValues): TCreateValues {
    const now = _now();
    const nextValues: MutationValues = { ...values };

    if (nextValues.householdId === undefined) {
      nextValues.householdId = context.householdId;
    }

    if (this.table.createdAt && nextValues.createdAt === undefined) {
      nextValues.createdAt = now;
    }

    if (this.table.updatedAt && nextValues.updatedAt === undefined) {
      nextValues.updatedAt = now;
    }

    return nextValues as TCreateValues;
  }

  private withUpdateTimestamp(values: TUpdateValues): TUpdateValues {
    if (!this.table.updatedAt) return values;
    return { ...values, updatedAt: _now() } as TUpdateValues;
  }
}
