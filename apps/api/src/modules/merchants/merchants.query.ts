import type { listMerchantsQuerySchema } from "@luraba/contracts/merchants";
import { eq, type SQL, sql } from "drizzle-orm";
import type { z } from "zod";
import { merchantsTable } from "@/db/schemas/merchants.schema";
import {
  buildIlikeSearch,
  buildOrderBy,
  combineConditions,
  nullabilityCondition,
  rangeConditions,
} from "@/shared/list";

export type ListMerchantsQuery = z.output<typeof listMerchantsQuerySchema>;

export function buildMerchantsListWhere(householdId: string, query: ListMerchantsQuery): SQL {
  return combineConditions(
    eq(merchantsTable.householdId, householdId),
    buildIlikeSearch(query.search, [sql`${merchantsTable.name}`, sql`${merchantsTable.domain}`]),
    nullabilityCondition(merchantsTable.domain, query.hasDomain),
    nullabilityCondition(merchantsTable.logoUrl, query.hasLogo),
    ...rangeConditions(merchantsTable.createdAt, query.createdAtFrom, query.createdAtTo),
    ...rangeConditions(merchantsTable.updatedAt, query.updatedAtFrom, query.updatedAtTo),
  ) as SQL;
}

export function buildMerchantsListOrder(query: ListMerchantsQuery): SQL[] {
  return buildOrderBy(
    query,
    {
      createdAt: sql`${merchantsTable.createdAt}`,
      domain: sql`${merchantsTable.domain}`,
      name: sql`${merchantsTable.name}`,
      updatedAt: sql`${merchantsTable.updatedAt}`,
    },
    [sql`${merchantsTable.name} asc`, sql`${merchantsTable.id} asc`],
  );
}
