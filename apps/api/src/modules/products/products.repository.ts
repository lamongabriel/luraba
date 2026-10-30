import { productsTable } from "@luraba/db/schemas/products.schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { type DbListPage, getPagination } from "@/shared/list";
import {
  type DbExecutor,
  HouseholdScopedRepository,
} from "@/shared/repositories/household-scoped.repository";
import {
  buildProductsListOrder,
  buildProductsListWhere,
  type ListProductsQuery,
} from "./products.query";
import type { ProductRecord } from "./products.types";

type CreateProductValues = Omit<
  typeof productsTable.$inferInsert,
  "id" | "householdId" | "createdAt" | "updatedAt"
>;

class ProductRepository extends HouseholdScopedRepository<ProductRecord, CreateProductValues> {
  constructor() {
    super(productsTable, { orderBy: productsTable.name });
  }

  async findByName(
    context: HouseholdContext,
    name: string,
    executor: DbExecutor = db,
  ): Promise<ProductRecord | undefined> {
    const [row] = await executor
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.householdId, context.householdId), eq(productsTable.name, name)))
      .limit(1);
    return row;
  }

  async findByIds(
    context: HouseholdContext,
    ids: string[],
    executor: DbExecutor = db,
  ): Promise<ProductRecord[]> {
    if (ids.length === 0) return [];
    return executor
      .select()
      .from(productsTable)
      .where(
        and(eq(productsTable.householdId, context.householdId), inArray(productsTable.id, ids)),
      );
  }

  async listPage(
    context: HouseholdContext,
    query: ListProductsQuery,
  ): Promise<DbListPage<ProductRecord>> {
    const where = buildProductsListWhere(context.householdId, query);
    const orderBy = buildProductsListOrder(query);
    const { limit, offset } = getPagination(query);
    const [countRow, rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::integer` }).from(productsTable).where(where),
      db
        .select()
        .from(productsTable)
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
    ]);
    return { rows, totalCount: countRow[0]?.count ?? 0 };
  }
}

export const productsRepository = new ProductRepository();
