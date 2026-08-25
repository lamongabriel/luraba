import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type { HouseholdContext } from '@/config/permissions';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { categoriesTable } from '@/db/schemas/categories.schema';
import { merchantsTable } from '@/db/schemas/merchants.schema';
import { paymentMethodsTable } from '@/db/schemas/payment-methods.schema';
import {
  recurringBillOccurrencesTable,
  recurringBillsTable,
} from '@/db/schemas/recurring-bills.schema';
import type { TransactionFilterQuery } from '@/modules/transactions/transactions.query';
import type {
  CreateRecurringBillBody,
  ListRecurringBillsQuery,
  UpdateRecurringBillBody,
} from './recurring-bills.types';

const sortFields = {
  name: recurringBillsTable.name,
  amount: recurringBillsTable.amount,
  startDate: recurringBillsTable.startDate,
  createdAt: recurringBillsTable.createdAt,
  updatedAt: recurringBillsTable.updatedAt,
} as const;

function whereFor(context: HouseholdContext, query?: ListRecurringBillsQuery) {
  const predicates = [eq(recurringBillsTable.householdId, context.householdId)];
  if (query?.search) predicates.push(ilike(recurringBillsTable.name, `%${query.search}%`));
  if (query?.status?.length) predicates.push(inArray(recurringBillsTable.status, query.status));
  if (query?.type?.length) predicates.push(inArray(recurringBillsTable.type, query.type));
  return and(...predicates);
}

export async function list(context: HouseholdContext, query: ListRecurringBillsQuery) {
  const where = whereFor(context, query);
  const field = sortFields[query.sort];
  const order = query.sortDirection === 'desc' ? desc(field) : asc(field);
  const offset = (query.page - 1) * query.perPage;
  const [rows, count] = await Promise.all([
    db
      .select()
      .from(recurringBillsTable)
      .where(where)
      .orderBy(order, asc(recurringBillsTable.id))
      .limit(query.perPage)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(recurringBillsTable).where(where),
  ]);
  return { rows, totalCount: count[0]?.count ?? 0 };
}

export async function listUpcomingCandidates(
  context: HouseholdContext,
  query: TransactionFilterQuery,
) {
  const types = query.originTypes.filter(
    (type): type is 'income' | 'expense' => type === 'income' || type === 'expense',
  );
  if (query.originTypes.length > 0 && types.length === 0) return [];

  const categoryFilter =
    query.categoryIds.length > 0 || query.uncategorized === true
      ? or(
          query.categoryIds.length > 0
            ? inArray(recurringBillsTable.categoryId, query.categoryIds)
            : undefined,
          query.uncategorized === true ? sql`${recurringBillsTable.categoryId} is null` : undefined,
        )
      : undefined;
  const predicates = [
    eq(recurringBillsTable.householdId, context.householdId),
    eq(recurringBillsTable.status, 'active'),
    query.search
      ? or(
          ilike(recurringBillsTable.name, `%${query.search}%`),
          ilike(recurringBillsTable.description, `%${query.search}%`),
        )
      : undefined,
    types.length > 0 ? inArray(recurringBillsTable.type, types) : undefined,
    query.accountIds.length > 0
      ? inArray(recurringBillsTable.accountId, query.accountIds)
      : undefined,
    categoryFilter,
    query.merchantIds.length > 0
      ? inArray(recurringBillsTable.merchantId, query.merchantIds)
      : undefined,
    query.currencyCodes.length > 0
      ? inArray(recurringBillsTable.currencyCode, query.currencyCodes)
      : undefined,
    query.paymentMethodCodes.length > 0
      ? inArray(paymentMethodsTable.code, query.paymentMethodCodes)
      : undefined,
  ].filter((predicate): predicate is NonNullable<typeof predicate> => Boolean(predicate));

  const rows = await db
    .select({
      bill: recurringBillsTable,
      accountName: accountsTable.name,
      categoryName: categoriesTable.name,
      merchantName: merchantsTable.name,
    })
    .from(recurringBillsTable)
    .innerJoin(accountsTable, eq(accountsTable.id, recurringBillsTable.accountId))
    .leftJoin(categoriesTable, eq(categoriesTable.id, recurringBillsTable.categoryId))
    .leftJoin(merchantsTable, eq(merchantsTable.id, recurringBillsTable.merchantId))
    .leftJoin(paymentMethodsTable, eq(paymentMethodsTable.id, recurringBillsTable.paymentMethodId))
    .where(and(...predicates));

  return rows;
}

export async function get(context: HouseholdContext, id: string) {
  return (
    await db
      .select()
      .from(recurringBillsTable)
      .where(
        and(
          eq(recurringBillsTable.id, id),
          eq(recurringBillsTable.householdId, context.householdId),
        ),
      )
      .limit(1)
  )[0];
}

export async function create(
  context: HouseholdContext,
  body: CreateRecurringBillBody,
  paymentMethodId: string | null,
) {
  return (
    await db
      .insert(recurringBillsTable)
      .values({
        householdId: context.householdId,
        ownerUserId: context.userId,
        name: body.name,
        description: body.description ?? null,
        type: body.type,
        accountId: body.accountId,
        categoryId: body.categoryId ?? null,
        merchantId: body.merchantId ?? null,
        paymentMethodId,
        amount: body.amount,
        currencyCode: body.currencyCode,
        startDate: body.startDate,
        endDate: body.endDate ?? null,
        frequency: body.frequency,
        dayOfMonth: body.dayOfMonth ?? null,
        dayOfWeek: body.dayOfWeek ?? null,
      })
      .returning()
  )[0];
}

export async function update(
  context: HouseholdContext,
  id: string,
  body: UpdateRecurringBillBody,
  paymentMethodId?: string | null,
) {
  const values = {
    ...body,
    ...(body.paymentMethodCode !== undefined ? { paymentMethodId } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.endDate !== undefined ? { endDate: body.endDate } : {}),
    ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
    ...(body.merchantId !== undefined ? { merchantId: body.merchantId } : {}),
    updatedAt: new Date(),
  } as Record<string, unknown>;
  delete values.paymentMethodCode;
  return (
    await db
      .update(recurringBillsTable)
      .set(values)
      .where(
        and(
          eq(recurringBillsTable.id, id),
          eq(recurringBillsTable.householdId, context.householdId),
        ),
      )
      .returning()
  )[0];
}

export async function remove(context: HouseholdContext, id: string) {
  await db
    .delete(recurringBillsTable)
    .where(
      and(eq(recurringBillsTable.id, id), eq(recurringBillsTable.householdId, context.householdId)),
    );
}

export async function getOccurrence(context: HouseholdContext, billId: string, date: Date) {
  return (
    await db
      .select({ occurrence: recurringBillOccurrencesTable })
      .from(recurringBillOccurrencesTable)
      .innerJoin(
        recurringBillsTable,
        eq(recurringBillsTable.id, recurringBillOccurrencesTable.recurringBillId),
      )
      .where(
        and(
          eq(recurringBillsTable.householdId, context.householdId),
          eq(recurringBillsTable.id, billId),
          eq(recurringBillOccurrencesTable.occurrenceDate, date),
        ),
      )
      .limit(1)
  )[0]?.occurrence;
}

export async function saveOccurrence(
  billId: string,
  date: Date,
  values: Partial<typeof recurringBillOccurrencesTable.$inferInsert>,
) {
  return (
    await db
      .insert(recurringBillOccurrencesTable)
      .values({ recurringBillId: billId, occurrenceDate: date, ...values })
      .onConflictDoUpdate({
        target: [
          recurringBillOccurrencesTable.recurringBillId,
          recurringBillOccurrencesTable.occurrenceDate,
        ],
        set: { ...values, updatedAt: new Date() },
      })
      .returning()
  )[0];
}
