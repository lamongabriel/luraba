import type { listAccountsQuerySchema } from "@luraba/contracts/accounts";
import { eq, ne, type SQL, sql } from "drizzle-orm";
import type { z } from "zod";
import { accountsTable } from "@/db/schemas/accounts.schema";
import {
  buildIlikeSearch,
  buildOrderBy,
  combineConditions,
  inArrayIfAny,
  nullabilityCondition,
  rangeConditions,
} from "@/shared/list";

export type ListAccountsQuery = z.output<typeof listAccountsQuerySchema>;

export function buildAccountsListWhere(
  householdId: string,
  query: ListAccountsQuery,
  displayedBalance: SQL,
  profileSubtype: SQL,
  profileSearchText: SQL,
): SQL {
  return combineConditions(
    eq(accountsTable.householdId, householdId),
    ne(accountsTable.type, "credit_card"),
    buildIlikeSearch(query.search, [
      sql`${accountsTable.name}`,
      sql`${accountsTable.institutionName}`,
      sql`${accountsTable.notes}`,
      sql`${accountsTable.type}`,
      sql`${accountsTable.classification}`,
      sql`${accountsTable.currencyId}`,
      profileSearchText,
    ]),
    inArrayIfAny(accountsTable.type, query.types),
    inArrayIfAny(profileSubtype, query.subtypes),
    inArrayIfAny(accountsTable.classification, query.classifications),
    inArrayIfAny(accountsTable.currencyId, query.currencyCodes),
    nullabilityCondition(accountsTable.institutionName, query.hasInstitution),
    ...rangeConditions(displayedBalance, query.balanceMin, query.balanceMax),
    ...rangeConditions(accountsTable.createdAt, query.createdAtFrom, query.createdAtTo),
    ...rangeConditions(accountsTable.updatedAt, query.updatedAtFrom, query.updatedAtTo),
  ) as SQL;
}

export function buildAccountsListOrder(
  query: ListAccountsQuery,
  displayedBalance: SQL,
  profileSubtype: SQL,
): SQL[] {
  return buildOrderBy(
    query,
    {
      balance: displayedBalance,
      classification: sql`${accountsTable.classification}`,
      createdAt: sql`${accountsTable.createdAt}`,
      currencyCode: sql`${accountsTable.currencyId}`,
      institutionName: sql`${accountsTable.institutionName}`,
      name: sql`${accountsTable.name}`,
      subtype: profileSubtype,
      type: sql`${accountsTable.type}`,
      updatedAt: sql`${accountsTable.updatedAt}`,
    },
    [sql`${accountsTable.name} asc`, sql`${accountsTable.id} asc`],
  );
}
