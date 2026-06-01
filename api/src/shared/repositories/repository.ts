import { asc, eq } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import { now as _now } from '@/shared/lib/date';

type RepositoryTable = PgTable & {
  id: PgColumn;
  createdAt?: PgColumn;
  updatedAt?: PgColumn;
};

type RepositoryOptions = {
  orderBy?: PgColumn;
};

type MutationValues = Record<string, unknown>;

export abstract class Repository<
  TRecord,
  TCreateValues extends MutationValues = MutationValues,
  TUpdateValues extends MutationValues = Partial<TCreateValues>,
> {
  protected constructor(
    private readonly table: RepositoryTable,
    private readonly options: RepositoryOptions = {},
  ) {}

  async list(): Promise<TRecord[]> {
    const query = db.select().from(this.table);

    if (this.options.orderBy) {
      return query.orderBy(asc(this.options.orderBy)) as Promise<TRecord[]>;
    }

    return query as Promise<TRecord[]>;
  }

  async get(id: string): Promise<TRecord | undefined> {
    const rows = await db.select().from(this.table).where(eq(this.table.id, id));
    return rows[0] as TRecord | undefined;
  }

  async create(values: TCreateValues): Promise<TRecord> {
    const rows = await db.insert(this.table).values(this.withCreateDefaults(values)).returning();
    return rows[0] as TRecord;
  }

  async update(id: string, values: TUpdateValues): Promise<TRecord | undefined> {
    const rows = await db
      .update(this.table)
      .set(this.withUpdateTimestamp(values))
      .where(eq(this.table.id, id))
      .returning();

    return rows[0] as TRecord | undefined;
  }

  async delete(id: string): Promise<TRecord | undefined> {
    const rows = await db.delete(this.table).where(eq(this.table.id, id)).returning();
    return rows[0] as TRecord | undefined;
  }

  private withCreateDefaults(values: TCreateValues): TCreateValues {
    const now = _now();
    const nextValues: MutationValues = { ...values };

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
