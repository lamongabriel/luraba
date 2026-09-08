import { and, eq, sql } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { merchantsTable } from "@/db/schemas/merchants.schema";
import { type DbListPage, getPagination } from "@/shared/list";
import { HouseholdScopedRepository } from "@/shared/repositories/household-scoped.repository";
import {
  buildMerchantsListOrder,
  buildMerchantsListWhere,
  type ListMerchantsQuery,
} from "./merchants.query";
import type { MerchantRecord } from "./merchants.types";

type CreateMerchantValues = Omit<
  typeof merchantsTable.$inferInsert,
  "id" | "householdId" | "createdAt" | "updatedAt"
>;

class MerchantRepository extends HouseholdScopedRepository<MerchantRecord, CreateMerchantValues> {
  constructor() {
    super(merchantsTable, { orderBy: merchantsTable.name });
  }

  async findByName(context: HouseholdContext, name: string): Promise<MerchantRecord | undefined> {
    const rows = await db
      .select()
      .from(merchantsTable)
      .where(
        and(eq(merchantsTable.householdId, context.householdId), eq(merchantsTable.name, name)),
      )
      .limit(1);

    return rows[0];
  }

  async listPage(
    context: HouseholdContext,
    query: ListMerchantsQuery,
  ): Promise<DbListPage<MerchantRecord>> {
    const where = buildMerchantsListWhere(context.householdId, query);
    const orderBy = buildMerchantsListOrder(query);
    const { limit, offset } = getPagination(query);
    const [countRow, rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::integer` }).from(merchantsTable).where(where),
      db
        .select()
        .from(merchantsTable)
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
    ]);

    return {
      rows,
      totalCount: countRow[0]?.count ?? 0,
    };
  }
}

export const merchantsRepository = new MerchantRepository();
