import type { listProductsQuerySchema } from "@luraba/contracts/products";
import { productsTable } from "@luraba/db/schemas/products.schema";
import { eq, type SQL, sql } from "drizzle-orm";
import type { z } from "zod";
import {
  buildIlikeSearch,
  buildOrderBy,
  combineConditions,
  nullabilityCondition,
} from "@/shared/list";

export type ListProductsQuery = z.output<typeof listProductsQuerySchema>;

export function buildProductsListWhere(householdId: string, query: ListProductsQuery): SQL {
  return combineConditions(
    eq(productsTable.householdId, householdId),
    buildIlikeSearch(query.search, [sql`${productsTable.name}`]),
    nullabilityCondition(productsTable.imageUploadId, query.hasImage),
  ) as SQL;
}

export function buildProductsListOrder(query: ListProductsQuery): SQL[] {
  return buildOrderBy(
    query,
    {
      createdAt: sql`${productsTable.createdAt}`,
      name: sql`${productsTable.name}`,
      price: sql`${productsTable.price}`,
      updatedAt: sql`${productsTable.updatedAt}`,
    },
    [sql`${productsTable.name} asc`, sql`${productsTable.id} asc`],
  );
}
