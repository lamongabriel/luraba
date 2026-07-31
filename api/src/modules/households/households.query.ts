import { eq, gt, type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import {
  householdInvitesTable,
  householdMembersTable,
  householdsTable,
} from '@/db/schemas/households.schema';
import { usersTable } from '@/db/schemas/users.schema';
import {
  booleanQuerySchema,
  buildIlikeSearch,
  buildOrderBy,
  combineConditions,
  commaSeparatedArraySchema,
  createListQuerySchema,
  inArrayIfAny,
  rangeConditions,
  temporalQuerySchema,
  validateRange,
} from '@/shared/list';
import { householdRoleSchema } from '@/shared/validation/households';
import {
  countryCodeSchema,
  creditExpenseTimingSchema,
  creditInstallmentBudgetModeSchema,
  currencySchema,
  timezoneSchema,
} from '@/shared/validation/preferences';

export const householdInviteInviter = alias(usersTable, 'household_invite_inviter');

export const householdInviteComputedStatusSchema = z.enum([
  'pending',
  'expired',
  'accepted',
  'rejected',
  'canceled',
]);

export const householdInviteComputedStatusSql = sql<string>`
  case
    when ${householdInvitesTable.status} = 'pending'
      and ${householdInvitesTable.expiresAt} <= now()
    then 'expired'
    else ${householdInvitesTable.status}::text
  end
`;

export const ListHouseholdsRequestQuerySchema = createListQuerySchema(
  {
    roles: commaSeparatedArraySchema(householdRoleSchema),
    countryCodes: commaSeparatedArraySchema(countryCodeSchema),
    defaultCurrencyCodes: commaSeparatedArraySchema(currencySchema),
    timezones: commaSeparatedArraySchema(timezoneSchema),
    budgetMonthStartsOnMin: z.coerce.number().int().min(1).max(31).optional(),
    budgetMonthStartsOnMax: z.coerce.number().int().min(1).max(31).optional(),
    creditExpenseTimings: commaSeparatedArraySchema(creditExpenseTimingSchema),
    creditInstallmentBudgetModes: commaSeparatedArraySchema(creditInstallmentBudgetModeSchema),
    createdAtFrom: temporalQuerySchema.optional(),
    createdAtTo: temporalQuerySchema.optional(),
    updatedAtFrom: temporalQuerySchema.optional(),
    updatedAtTo: temporalQuerySchema.optional(),
  },
  ['countryCode', 'createdAt', 'defaultCurrencyId', 'name', 'role', 'updatedAt'],
).superRefine((query, ctx) => {
  validateRange(query, ctx, 'budgetMonthStartsOnMin', 'budgetMonthStartsOnMax');
  validateRange(query, ctx, 'createdAtFrom', 'createdAtTo');
  validateRange(query, ctx, 'updatedAtFrom', 'updatedAtTo');
});

export type ListHouseholdsRequestQuery = z.infer<typeof ListHouseholdsRequestQuerySchema>;

export const ListHouseholdMembersRequestQuerySchema = createListQuerySchema(
  {
    roles: commaSeparatedArraySchema(householdRoleSchema),
    emailVerified: booleanQuerySchema.optional(),
    lastActiveAtFrom: temporalQuerySchema.optional(),
    lastActiveAtTo: temporalQuerySchema.optional(),
    createdAtFrom: temporalQuerySchema.optional(),
    createdAtTo: temporalQuerySchema.optional(),
    updatedAtFrom: temporalQuerySchema.optional(),
    updatedAtTo: temporalQuerySchema.optional(),
  },
  ['createdAt', 'email', 'emailVerified', 'lastActiveAt', 'name', 'role', 'updatedAt'],
).superRefine((query, ctx) => {
  validateRange(query, ctx, 'lastActiveAtFrom', 'lastActiveAtTo');
  validateRange(query, ctx, 'createdAtFrom', 'createdAtTo');
  validateRange(query, ctx, 'updatedAtFrom', 'updatedAtTo');
});

export type ListHouseholdMembersRequestQuery = z.infer<
  typeof ListHouseholdMembersRequestQuerySchema
>;

const householdInviteFilterShape = {
  roles: commaSeparatedArraySchema(householdRoleSchema),
  statuses: commaSeparatedArraySchema(householdInviteComputedStatusSchema),
  createdAtFrom: temporalQuerySchema.optional(),
  createdAtTo: temporalQuerySchema.optional(),
  updatedAtFrom: temporalQuerySchema.optional(),
  updatedAtTo: temporalQuerySchema.optional(),
  expiresAtFrom: temporalQuerySchema.optional(),
  expiresAtTo: temporalQuerySchema.optional(),
  acceptedAtFrom: temporalQuerySchema.optional(),
  acceptedAtTo: temporalQuerySchema.optional(),
  rejectedAtFrom: temporalQuerySchema.optional(),
  rejectedAtTo: temporalQuerySchema.optional(),
  canceledAtFrom: temporalQuerySchema.optional(),
  canceledAtTo: temporalQuerySchema.optional(),
} as const;

const householdInviteSortFields = [
  'acceptedAt',
  'createdAt',
  'email',
  'expiresAt',
  'householdName',
  'role',
  'rejectedAt',
  'canceledAt',
  'status',
  'updatedAt',
] as const;

export const ListHouseholdInvitesRequestQuerySchema = createListQuerySchema(
  householdInviteFilterShape,
  householdInviteSortFields,
).superRefine((query, ctx) => {
  validateRange(query, ctx, 'createdAtFrom', 'createdAtTo');
  validateRange(query, ctx, 'updatedAtFrom', 'updatedAtTo');
  validateRange(query, ctx, 'expiresAtFrom', 'expiresAtTo');
  validateRange(query, ctx, 'acceptedAtFrom', 'acceptedAtTo');
  validateRange(query, ctx, 'rejectedAtFrom', 'rejectedAtTo');
  validateRange(query, ctx, 'canceledAtFrom', 'canceledAtTo');
});

export type ListHouseholdInvitesRequestQuery = z.infer<
  typeof ListHouseholdInvitesRequestQuerySchema
>;

export const ListMyHouseholdInvitesRequestQuerySchema = createListQuerySchema(
  {
    ...householdInviteFilterShape,
    householdIds: commaSeparatedArraySchema(z.uuid()),
  },
  householdInviteSortFields,
).superRefine((query, ctx) => {
  validateRange(query, ctx, 'createdAtFrom', 'createdAtTo');
  validateRange(query, ctx, 'updatedAtFrom', 'updatedAtTo');
  validateRange(query, ctx, 'expiresAtFrom', 'expiresAtTo');
  validateRange(query, ctx, 'acceptedAtFrom', 'acceptedAtTo');
  validateRange(query, ctx, 'rejectedAtFrom', 'rejectedAtTo');
  validateRange(query, ctx, 'canceledAtFrom', 'canceledAtTo');
});

export type ListMyHouseholdInvitesRequestQuery = z.infer<
  typeof ListMyHouseholdInvitesRequestQuerySchema
>;

export function buildHouseholdsListWhere(userId: string, query: ListHouseholdsRequestQuery): SQL {
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

export function buildHouseholdsListOrder(query: ListHouseholdsRequestQuery): SQL[] {
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
  query: ListHouseholdMembersRequestQuery,
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

export function buildHouseholdMembersListOrder(query: ListHouseholdMembersRequestQuery): SQL[] {
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
  query: ListHouseholdInvitesRequestQuery | ListMyHouseholdInvitesRequestQuery,
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
  query: ListHouseholdInvitesRequestQuery,
): SQL {
  return combineConditions(
    eq(householdInvitesTable.householdId, householdId),
    ...buildInviteFilters(query),
  ) as SQL;
}

export function buildMyHouseholdInvitesListWhere(
  email: string,
  query: ListMyHouseholdInvitesRequestQuery,
): SQL {
  return combineConditions(
    eq(householdInvitesTable.email, email),
    eq(householdInvitesTable.status, 'pending'),
    gt(householdInvitesTable.expiresAt, sql`now()`),
    inArrayIfAny(householdInvitesTable.householdId, query.householdIds),
    ...buildInviteFilters(query),
  ) as SQL;
}

export function buildHouseholdInvitesListOrder(
  query: ListHouseholdInvitesRequestQuery | ListMyHouseholdInvitesRequestQuery,
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
