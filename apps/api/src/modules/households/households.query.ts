import type {
  listHouseholdInvitesQuerySchema,
  listHouseholdMembersQuerySchema,
  listHouseholdsQuerySchema,
  listMyHouseholdInvitesQuerySchema,
} from "@luraba/contracts/households";
import { eq, gt, type SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { z } from "zod";
import {
  householdInvitesTable,
  householdMembersTable,
  householdsTable,
} from "@/db/schemas/households.schema";
import { usersTable } from "@/db/schemas/users.schema";
import {
  buildIlikeSearch,
  buildOrderBy,
  combineConditions,
  inArrayIfAny,
  rangeConditions,
} from "@/shared/list";

export const householdInviteInviter = alias(usersTable, "household_invite_inviter");

export const householdInviteComputedStatusSql = sql<string>`
  case
    when ${householdInvitesTable.status} = 'pending'
      and ${householdInvitesTable.expiresAt} <= now()
    then 'expired'
    else ${householdInvitesTable.status}::text
  end
`;

export type ListHouseholdsQuery = z.output<typeof listHouseholdsQuerySchema>;
export type ListHouseholdMembersQuery = z.output<typeof listHouseholdMembersQuerySchema>;
export type ListHouseholdInvitesQuery = z.output<typeof listHouseholdInvitesQuerySchema>;
export type ListMyHouseholdInvitesQuery = z.output<typeof listMyHouseholdInvitesQuerySchema>;

export function buildHouseholdsListWhere(userId: string, query: ListHouseholdsQuery): SQL {
  return combineConditions(
    eq(householdMembersTable.userId, userId),
    buildIlikeSearch(query.search, [
      sql`${householdsTable.name}`,
      sql`${householdsTable.description}`,
      sql`${householdsTable.countryCode}`,
      sql`${householdsTable.defaultCurrencyId}`,
      sql`${householdsTable.timezone}`,
      sql`${householdMembersTable.role}`,
    ]),
    inArrayIfAny(householdMembersTable.role, query.roles),
    inArrayIfAny(householdsTable.countryCode, query.countryCodes),
    inArrayIfAny(householdsTable.defaultCurrencyId, query.defaultCurrencyCodes),
    inArrayIfAny(householdsTable.timezone, query.timezones),
    ...rangeConditions(
      householdsTable.budgetMonthStartsOn,
      query.budgetMonthStartsOnMin,
      query.budgetMonthStartsOnMax,
    ),
    inArrayIfAny(householdsTable.creditExpenseTiming, query.creditExpenseTimings),
    inArrayIfAny(householdsTable.creditInstallmentBudgetMode, query.creditInstallmentBudgetModes),
    ...rangeConditions(householdsTable.createdAt, query.createdAtFrom, query.createdAtTo),
    ...rangeConditions(householdsTable.updatedAt, query.updatedAtFrom, query.updatedAtTo),
  ) as SQL;
}

export function buildHouseholdsListOrder(query: ListHouseholdsQuery): SQL[] {
  return buildOrderBy(
    query,
    {
      countryCode: sql`${householdsTable.countryCode}`,
      createdAt: sql`${householdsTable.createdAt}`,
      defaultCurrencyId: sql`${householdsTable.defaultCurrencyId}`,
      name: sql`${householdsTable.name}`,
      role: sql`${householdMembersTable.role}`,
      updatedAt: sql`${householdsTable.updatedAt}`,
    },
    [sql`${householdsTable.name} asc`, sql`${householdsTable.id} asc`],
  );
}

export function buildHouseholdMembersListWhere(
  householdId: string,
  query: ListHouseholdMembersQuery,
): SQL {
  return combineConditions(
    eq(householdMembersTable.householdId, householdId),
    buildIlikeSearch(query.search, [
      sql`${usersTable.name}`,
      sql`${usersTable.email}`,
      sql`${householdMembersTable.role}`,
    ]),
    inArrayIfAny(householdMembersTable.role, query.roles),
    query.emailVerified === undefined
      ? undefined
      : eq(usersTable.emailVerified, query.emailVerified),
    ...rangeConditions(usersTable.lastActiveAt, query.lastActiveAtFrom, query.lastActiveAtTo),
    ...rangeConditions(householdMembersTable.createdAt, query.createdAtFrom, query.createdAtTo),
    ...rangeConditions(householdMembersTable.updatedAt, query.updatedAtFrom, query.updatedAtTo),
  ) as SQL;
}

export function buildHouseholdMembersListOrder(query: ListHouseholdMembersQuery): SQL[] {
  return buildOrderBy(
    query,
    {
      createdAt: sql`${householdMembersTable.createdAt}`,
      email: sql`${usersTable.email}`,
      emailVerified: sql`${usersTable.emailVerified}`,
      lastActiveAt: sql`${usersTable.lastActiveAt}`,
      name: sql`${usersTable.name}`,
      role: sql`${householdMembersTable.role}`,
      updatedAt: sql`${householdMembersTable.updatedAt}`,
    },
    [sql`${usersTable.name} asc`, sql`${usersTable.id} asc`],
  );
}

function buildInviteFilters(
  query: ListHouseholdInvitesQuery | ListMyHouseholdInvitesQuery,
): Array<SQL | undefined> {
  return [
    buildIlikeSearch(query.search, [
      sql`${householdsTable.name}`,
      sql`${householdInvitesTable.email}`,
      sql`${householdInvitesTable.role}`,
      householdInviteComputedStatusSql,
      sql`${householdInviteInviter.name}`,
      sql`${householdInviteInviter.email}`,
    ]),
    inArrayIfAny(householdInvitesTable.role, query.roles),
    inArrayIfAny(householdInviteComputedStatusSql, query.statuses),
    ...rangeConditions(householdInvitesTable.createdAt, query.createdAtFrom, query.createdAtTo),
    ...rangeConditions(householdInvitesTable.updatedAt, query.updatedAtFrom, query.updatedAtTo),
    ...rangeConditions(householdInvitesTable.expiresAt, query.expiresAtFrom, query.expiresAtTo),
    ...rangeConditions(householdInvitesTable.acceptedAt, query.acceptedAtFrom, query.acceptedAtTo),
    ...rangeConditions(householdInvitesTable.rejectedAt, query.rejectedAtFrom, query.rejectedAtTo),
    ...rangeConditions(householdInvitesTable.canceledAt, query.canceledAtFrom, query.canceledAtTo),
  ];
}

export function buildHouseholdInvitesListWhere(
  householdId: string,
  query: ListHouseholdInvitesQuery,
): SQL {
  return combineConditions(
    eq(householdInvitesTable.householdId, householdId),
    ...buildInviteFilters(query),
  ) as SQL;
}

export function buildMyHouseholdInvitesListWhere(
  email: string,
  query: ListMyHouseholdInvitesQuery,
): SQL {
  return combineConditions(
    eq(householdInvitesTable.email, email),
    eq(householdInvitesTable.status, "pending"),
    gt(householdInvitesTable.expiresAt, sql`now()`),
    inArrayIfAny(householdInvitesTable.householdId, query.householdIds),
    ...buildInviteFilters(query),
  ) as SQL;
}

export function buildHouseholdInvitesListOrder(
  query: ListHouseholdInvitesQuery | ListMyHouseholdInvitesQuery,
  personal = false,
): SQL[] {
  return buildOrderBy(
    query,
    {
      acceptedAt: sql`${householdInvitesTable.acceptedAt}`,
      createdAt: sql`${householdInvitesTable.createdAt}`,
      email: sql`${householdInvitesTable.email}`,
      expiresAt: sql`${householdInvitesTable.expiresAt}`,
      householdName: sql`${householdsTable.name}`,
      rejectedAt: sql`${householdInvitesTable.rejectedAt}`,
      canceledAt: sql`${householdInvitesTable.canceledAt}`,
      role: sql`${householdInvitesTable.role}`,
      status: householdInviteComputedStatusSql,
      updatedAt: sql`${householdInvitesTable.updatedAt}`,
    },
    personal
      ? [sql`${householdsTable.name} asc`, sql`${householdInvitesTable.id} asc`]
      : [sql`${householdInvitesTable.email} asc`, sql`${householdInvitesTable.id} asc`],
  );
}
