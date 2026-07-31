import { eq, type SQL, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  householdInvitesTable,
  householdMembersTable,
  householdsTable,
} from '@/db/schemas/households.schema';
import { usersTable } from '@/db/schemas/users.schema';
import {
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
import { householdInviteStatusSchema, householdRoleSchema } from '@/shared/validation/households';
import {
  countryCodeSchema,
  creditExpenseTimingSchema,
  creditInstallmentBudgetModeSchema,
  currencySchema,
  timezoneSchema,
} from '@/shared/validation/preferences';

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
    createdAtFrom: temporalQuerySchema.optional(),
    createdAtTo: temporalQuerySchema.optional(),
    updatedAtFrom: temporalQuerySchema.optional(),
    updatedAtTo: temporalQuerySchema.optional(),
  },
  ['createdAt', 'email', 'name', 'role', 'updatedAt'],
).superRefine((query, ctx) => {
  validateRange(query, ctx, 'createdAtFrom', 'createdAtTo');
  validateRange(query, ctx, 'updatedAtFrom', 'updatedAtTo');
});

export type ListHouseholdMembersRequestQuery = z.infer<
  typeof ListHouseholdMembersRequestQuerySchema
>;

const householdInviteFilterShape = {
  roles: commaSeparatedArraySchema(householdRoleSchema),
  statuses: commaSeparatedArraySchema(householdInviteStatusSchema),
  createdAtFrom: temporalQuerySchema.optional(),
  createdAtTo: temporalQuerySchema.optional(),
  updatedAtFrom: temporalQuerySchema.optional(),
  updatedAtTo: temporalQuerySchema.optional(),
} as const;

const householdInviteSortFields = [
  'acceptedAt',
  'createdAt',
  'email',
  'householdName',
  'role',
  'revokedAt',
  'status',
  'updatedAt',
] as const;

export const ListHouseholdInvitesRequestQuerySchema = createListQuerySchema(
  householdInviteFilterShape,
  householdInviteSortFields,
).superRefine((query, ctx) => {
  validateRange(query, ctx, 'createdAtFrom', 'createdAtTo');
  validateRange(query, ctx, 'updatedAtFrom', 'updatedAtTo');
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
      sql`${householdInvitesTable.status}`,
    ]),
    inArrayIfAny(householdInvitesTable.role, query.roles),
    inArrayIfAny(householdInvitesTable.status, query.statuses),
    ...rangeConditions(householdInvitesTable.createdAt, query.createdAtFrom, query.createdAtTo),
    ...rangeConditions(householdInvitesTable.updatedAt, query.updatedAtFrom, query.updatedAtTo),
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
      householdName: sql`${householdsTable.name}`,
      revokedAt: sql`${householdInvitesTable.revokedAt}`,
      role: sql`${householdInvitesTable.role}`,
      status: sql`${householdInvitesTable.status}`,
      updatedAt: sql`${householdInvitesTable.updatedAt}`,
    },
    personal
      ? [sql`${householdsTable.name} asc`, sql`${householdInvitesTable.id} asc`]
      : [sql`${householdInvitesTable.email} asc`, sql`${householdInvitesTable.id} asc`],
  );
}
