import { eq, type SQL, sql } from 'drizzle-orm';
import { z } from 'zod';
import { accountsTable } from '@/db/schemas/accounts.schema';
import {
  booleanQuerySchema,
  buildIlikeSearch,
  buildOrderBy,
  combineConditions,
  commaSeparatedArraySchema,
  createListQuerySchema,
  inArrayIfAny,
  nullabilityCondition,
  rangeConditions,
  temporalQuerySchema,
  validateRange,
} from '@/shared/list';
import { accountClassificationSchema, accountTypeSchema } from '@/shared/validation/accounts';
import { currencySchema } from '@/shared/validation/preferences';

export {
  type ListAccountTransactionsRequestQuery,
  ListAccountTransactionsRequestQuerySchema,
} from '@/modules/transactions/transactions.query';

export const ListAccountsRequestQuerySchema = createListQuerySchema(
  {
    types: commaSeparatedArraySchema(accountTypeSchema),
    classifications: commaSeparatedArraySchema(accountClassificationSchema),
    currencyCodes: commaSeparatedArraySchema(currencySchema),
    balanceMin: z.coerce.number().int().optional(),
    balanceMax: z.coerce.number().int().optional(),
    hasInstitution: booleanQuerySchema.optional(),
    createdAtFrom: temporalQuerySchema.optional(),
    createdAtTo: temporalQuerySchema.optional(),
    updatedAtFrom: temporalQuerySchema.optional(),
    updatedAtTo: temporalQuerySchema.optional(),
  },
  [
    'name',
    'institutionName',
    'type',
    'classification',
    'currencyCode',
    'balance',
    'createdAt',
    'updatedAt',
  ],
).superRefine((query, ctx) => {
  validateRange(query, ctx, 'balanceMin', 'balanceMax');
  validateRange(query, ctx, 'createdAtFrom', 'createdAtTo');
  validateRange(query, ctx, 'updatedAtFrom', 'updatedAtTo');
});

export type ListAccountsRequestQuery = z.infer<typeof ListAccountsRequestQuerySchema>;

export function buildAccountsListWhere(
  householdId: string,
  query: ListAccountsRequestQuery,
  displayedBalance: SQL,
): SQL {
  return combineConditions(
    eq(accountsTable.householdId, householdId),
    buildIlikeSearch(query.search, [
      sql`${accountsTable.name}`,
      sql`${accountsTable.institutionName}`,
      sql`${accountsTable.notes}`,
      sql`${accountsTable.type}`,
      sql`${accountsTable.classification}`,
      sql`${accountsTable.currencyId}`,
    ]),
    inArrayIfAny(accountsTable.type, query.types),
    inArrayIfAny(accountsTable.classification, query.classifications),
    inArrayIfAny(accountsTable.currencyId, query.currencyCodes),
    nullabilityCondition(accountsTable.institutionName, query.hasInstitution),
    ...rangeConditions(displayedBalance, query.balanceMin, query.balanceMax),
    ...rangeConditions(accountsTable.createdAt, query.createdAtFrom, query.createdAtTo),
    ...rangeConditions(accountsTable.updatedAt, query.updatedAtFrom, query.updatedAtTo),
  ) as SQL;
}

export function buildAccountsListOrder(
  query: ListAccountsRequestQuery,
  displayedBalance: SQL,
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
      type: sql`${accountsTable.type}`,
      updatedAt: sql`${accountsTable.updatedAt}`,
    },
    [sql`${accountsTable.name} asc`, sql`${accountsTable.id} asc`],
  );
}
