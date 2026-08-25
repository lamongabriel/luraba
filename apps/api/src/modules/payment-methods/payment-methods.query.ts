import { eq, isNull, or, type SQL, sql } from 'drizzle-orm';
import { z } from 'zod';
import { paymentMethodsTable } from '@/db/schemas/payment-methods.schema';
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
import { currencySchema } from '@/shared/validation/preferences';

export const paymentMethodScopeSchema = z.enum(['system', 'household']);

export const ListPaymentMethodsRequestQuerySchema = createListQuerySchema(
  {
    codes: commaSeparatedArraySchema(z.string().trim().min(1).max(32)),
    scopes: commaSeparatedArraySchema(paymentMethodScopeSchema),
    currencyCode: currencySchema.optional(),
    hasCurrency: booleanQuerySchema.optional(),
    createdAtFrom: temporalQuerySchema.optional(),
    createdAtTo: temporalQuerySchema.optional(),
    updatedAtFrom: temporalQuerySchema.optional(),
    updatedAtTo: temporalQuerySchema.optional(),
  },
  ['name', 'code', 'scope', 'currencyCode', 'createdAt', 'updatedAt'],
).superRefine((query, ctx) => {
  validateRange(query, ctx, 'createdAtFrom', 'createdAtTo');
  validateRange(query, ctx, 'updatedAtFrom', 'updatedAtTo');
});

export type ListPaymentMethodsRequestQuery = z.infer<typeof ListPaymentMethodsRequestQuerySchema>;

export const paymentMethodScopeExpression = sql`
  case when ${paymentMethodsTable.householdId} is null then 'system' else 'household' end
`;

export function buildPaymentMethodsListWhere(
  householdId: string,
  query: ListPaymentMethodsRequestQuery,
): SQL {
  return combineConditions(
    or(isNull(paymentMethodsTable.householdId), eq(paymentMethodsTable.householdId, householdId)),
    query.currencyCode
      ? or(
          isNull(paymentMethodsTable.currencyId),
          eq(paymentMethodsTable.currencyId, query.currencyCode),
        )
      : undefined,
    buildIlikeSearch(query.search, [
      sql`${paymentMethodsTable.name}`,
      sql`${paymentMethodsTable.code}`,
      sql`${paymentMethodsTable.currencyId}`,
      paymentMethodScopeExpression,
    ]),
    inArrayIfAny(paymentMethodsTable.code, query.codes),
    inArrayIfAny(paymentMethodScopeExpression, query.scopes),
    nullabilityCondition(paymentMethodsTable.currencyId, query.hasCurrency),
    ...rangeConditions(paymentMethodsTable.createdAt, query.createdAtFrom, query.createdAtTo),
    ...rangeConditions(paymentMethodsTable.updatedAt, query.updatedAtFrom, query.updatedAtTo),
  ) as SQL;
}

export function buildPaymentMethodsListOrder(query: ListPaymentMethodsRequestQuery): SQL[] {
  return buildOrderBy(
    query,
    {
      code: sql`${paymentMethodsTable.code}`,
      createdAt: sql`${paymentMethodsTable.createdAt}`,
      currencyCode: sql`${paymentMethodsTable.currencyId}`,
      name: sql`${paymentMethodsTable.name}`,
      scope: paymentMethodScopeExpression,
      updatedAt: sql`${paymentMethodsTable.updatedAt}`,
    },
    [
      sql`${paymentMethodsTable.name} asc`,
      sql`${paymentMethodsTable.code} asc`,
      sql`${paymentMethodsTable.currencyId} asc`,
      sql`${paymentMethodsTable.id} asc`,
    ],
  );
}
