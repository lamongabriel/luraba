import { type SQL, sql } from 'drizzle-orm';
import { z } from 'zod';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { categoriesTable } from '@/db/schemas/categories.schema';
import { creditCardBillingCyclesTable } from '@/db/schemas/credit-card-billing-cycles.schema';
import { creditCardInstallmentsTable } from '@/db/schemas/credit-card-installments.schema';
import { creditCardPaymentsTable } from '@/db/schemas/credit-card-payments.schema';
import { creditCardPurchasesTable } from '@/db/schemas/credit-card-purchases.schema';
import { creditCardsTable } from '@/db/schemas/credit-cards.schema';
import { entriesTable } from '@/db/schemas/entries.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { merchantsTable } from '@/db/schemas/merchants.schema';
import { paymentMethodsTable } from '@/db/schemas/payment-methods.schema';
import { tagsTable } from '@/db/schemas/tags.schema';
import { transactionTagsTable } from '@/db/schemas/transaction-tags.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';
import {
  booleanQuerySchema,
  buildIlikeSearch,
  buildOrderBy,
  combineConditions,
  commaSeparatedArraySchema,
  createListQuerySchema,
  dateQuerySchema,
  rangeConditions,
  temporalQuerySchema,
  validateRange,
} from '@/shared/list';
import { currencySchema } from '@/shared/validation/preferences';
import { transactionFeedOriginTypeSchema } from './transactions.types';

const paymentMethodCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .transform((value) => value.toLowerCase());

const commonTransactionFilterShape = {
  dateFrom: dateQuerySchema.optional(),
  dateTo: dateQuerySchema.optional(),
  purchaseDateFrom: dateQuerySchema.optional(),
  purchaseDateTo: dateQuerySchema.optional(),
  originTypes: commaSeparatedArraySchema(transactionFeedOriginTypeSchema),
  categoryIds: commaSeparatedArraySchema(z.uuid()),
  merchantIds: commaSeparatedArraySchema(z.uuid()),
  tagIds: commaSeparatedArraySchema(z.uuid()),
  paymentMethodCodes: commaSeparatedArraySchema(paymentMethodCodeSchema),
  currencyCodes: commaSeparatedArraySchema(currencySchema),
  amountMin: z.coerce.number().int().min(0).optional(),
  amountMax: z.coerce.number().int().min(0).optional(),
  includeInBudget: booleanQuerySchema.optional(),
  excludedFromSpending: booleanQuerySchema.optional(),
  createdAtFrom: temporalQuerySchema.optional(),
  createdAtTo: temporalQuerySchema.optional(),
  updatedAtFrom: temporalQuerySchema.optional(),
  updatedAtTo: temporalQuerySchema.optional(),
} as const;

const transactionSortFields = [
  'amount',
  'createdAt',
  'description',
  'originType',
  'postedDate',
  'purchaseDate',
  'updatedAt',
] as const;

function validateTransactionRanges(query: Record<string, unknown>, ctx: z.RefinementCtx) {
  validateRange(query, ctx, 'dateFrom', 'dateTo');
  validateRange(query, ctx, 'purchaseDateFrom', 'purchaseDateTo');
  validateRange(query, ctx, 'amountMin', 'amountMax');
  validateRange(query, ctx, 'createdAtFrom', 'createdAtTo');
  validateRange(query, ctx, 'updatedAtFrom', 'updatedAtTo');
}

export const ListTransactionsRequestQuerySchema = createListQuerySchema(
  {
    ...commonTransactionFilterShape,
    accountIds: commaSeparatedArraySchema(z.uuid()),
    creditCardIds: commaSeparatedArraySchema(z.uuid()),
  },
  transactionSortFields,
).superRefine(validateTransactionRanges);

export type ListTransactionsRequestQuery = z.infer<typeof ListTransactionsRequestQuerySchema>;

export const ListAccountTransactionsRequestQuerySchema = createListQuerySchema(
  commonTransactionFilterShape,
  transactionSortFields,
).superRefine(validateTransactionRanges);

export type ListAccountTransactionsRequestQuery = z.infer<
  typeof ListAccountTransactionsRequestQuerySchema
>;

function sqlArray(values: string[], cast: 'text' | 'uuid'): SQL {
  return sql`array[${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )}]::${sql.raw(cast)}[]`;
}

export function buildTransactionFeedWhere(query: ListTransactionsRequestQuery): SQL | undefined {
  return combineConditions(
    buildIlikeSearch(query.search, [sql`search_blob`]),
    query.dateFrom ? sql`posted_date >= ${query.dateFrom}::date` : undefined,
    query.dateTo ? sql`posted_date <= ${query.dateTo}::date` : undefined,
    query.purchaseDateFrom ? sql`purchase_date >= ${query.purchaseDateFrom}::date` : undefined,
    query.purchaseDateTo ? sql`purchase_date <= ${query.purchaseDateTo}::date` : undefined,
    query.originTypes.length > 0
      ? sql`origin_type = any(${sqlArray(query.originTypes, 'text')})`
      : undefined,
    query.accountIds.length > 0
      ? sql`account_ids && ${sqlArray(query.accountIds, 'uuid')}`
      : undefined,
    query.creditCardIds.length > 0
      ? sql`credit_card_id = any(${sqlArray(query.creditCardIds, 'uuid')})`
      : undefined,
    query.categoryIds.length > 0
      ? sql`category_id = any(${sqlArray(query.categoryIds, 'uuid')})`
      : undefined,
    query.merchantIds.length > 0
      ? sql`merchant_id = any(${sqlArray(query.merchantIds, 'uuid')})`
      : undefined,
    query.tagIds.length > 0 ? sql`tag_ids && ${sqlArray(query.tagIds, 'uuid')}` : undefined,
    query.paymentMethodCodes.length > 0
      ? sql`payment_method_code = any(${sqlArray(query.paymentMethodCodes, 'text')})`
      : undefined,
    query.currencyCodes.length > 0
      ? sql`currency_codes && ${sqlArray(query.currencyCodes, 'text')}`
      : undefined,
    ...rangeConditions(sql`amount`, query.amountMin, query.amountMax),
    query.includeInBudget === undefined
      ? undefined
      : sql`include_in_budget = ${query.includeInBudget}`,
    query.excludedFromSpending === undefined
      ? undefined
      : sql`excluded_from_spending = ${query.excludedFromSpending}`,
    ...rangeConditions(sql`created_at`, query.createdAtFrom, query.createdAtTo),
    ...rangeConditions(sql`updated_at`, query.updatedAtFrom, query.updatedAtTo),
  );
}

export function buildTransactionFeedOrder(query: ListTransactionsRequestQuery): SQL[] {
  return buildOrderBy(
    query,
    {
      amount: sql`amount`,
      createdAt: sql`created_at`,
      description: sql`description`,
      originType: sql`origin_type`,
      postedDate: sql`posted_date`,
      purchaseDate: sql`purchase_date`,
      updatedAt: sql`updated_at`,
    },
    [sql`posted_date desc`, sql`created_at desc`, sql`row_id desc`],
  );
}

export function buildTransactionFeedCte(
  householdId: string,
  query: ListTransactionsRequestQuery,
): SQL {
  const where = buildTransactionFeedWhere(query);
  const whereClause = where ? sql`where ${where}` : sql``;

  return sql`
    with entry_rollup as (
      select
        ${entriesTable.transactionId} as transaction_id,
        coalesce(
          max(abs(${entriesTable.amount})) filter (
            where ${ledgerAccountsTable.ownerType} = 'account'
              and ${transactionsTable.type} = 'transfer'
              and ${entriesTable.amount} < 0
          ),
          max(abs(${entriesTable.amount})) filter (
            where ${ledgerAccountsTable.ownerType} = 'account'
          ),
          0
        )::integer as display_amount,
        coalesce(
          array_agg(distinct ${accountsTable.id}) filter (
            where ${accountsTable.id} is not null
          ),
          array[]::uuid[]
        ) as account_ids,
        coalesce(
          array_agg(distinct ${entriesTable.currencyId})::text[],
          array[]::text[]
        ) as currency_codes,
        coalesce(
          string_agg(distinct ${accountsTable.name}, ' ') filter (
            where ${accountsTable.name} is not null
          ),
          ''
        ) as account_names
      from ${entriesTable}
      inner join ${transactionsTable}
        on ${transactionsTable.id} = ${entriesTable.transactionId}
       and ${transactionsTable.householdId} = ${householdId}
      inner join ${ledgerAccountsTable}
        on ${ledgerAccountsTable.id} = ${entriesTable.ledgerAccountId}
      left join ${accountsTable}
        on ${accountsTable.id} = ${ledgerAccountsTable.ownerId}
       and ${ledgerAccountsTable.ownerType} = 'account'
      group by ${entriesTable.transactionId}
    ),
    tag_rollup as (
      select
        ${transactionTagsTable.transactionId} as transaction_id,
        array_agg(${transactionTagsTable.tagId}) as tag_ids,
        string_agg(${tagsTable.name}, ' ') as tag_names
      from ${transactionTagsTable}
      inner join ${tagsTable}
        on ${tagsTable.id} = ${transactionTagsTable.tagId}
       and ${tagsTable.householdId} = ${householdId}
      group by ${transactionTagsTable.transactionId}
    ),
    standard_transactions as (
      select
        ${transactionsTable.id} as row_id,
        case
          when ${creditCardPaymentsTable.id} is not null then 'credit_card_payment'
          else 'transaction'
        end as row_kind,
        ${transactionsTable.id} as transaction_id,
        null::uuid as installment_id,
        case
          when ${creditCardPaymentsTable.id} is not null then 'credit_card_payment'
          else ${transactionsTable.type}::text
        end as origin_type,
        ${transactionsTable.description} as description,
        ${transactionsTable.purchaseDate} as purchase_date,
        ${transactionsTable.postedDate} as posted_date,
        ${transactionsTable.createdAt} as created_at,
        ${transactionsTable.updatedAt} as updated_at,
        entry_rollup.display_amount as amount,
        ${transactionsTable.includeInBudget} as include_in_budget,
        case
          when ${creditCardPaymentsTable.id} is not null then true
          when ${transactionsTable.type} = 'expense' then not ${transactionsTable.includeInBudget}
          else true
        end as excluded_from_spending,
        ${transactionsTable.categoryId} as category_id,
        ${transactionsTable.merchantId} as merchant_id,
        ${paymentMethodsTable.code} as payment_method_code,
        ${creditCardPaymentsTable.creditCardId} as credit_card_id,
        entry_rollup.account_ids,
        entry_rollup.currency_codes,
        coalesce(tag_rollup.tag_ids, array[]::uuid[]) as tag_ids,
        concat_ws(
          ' ',
          ${transactionsTable.description},
          ${transactionsTable.type}::text,
          ${paymentMethodsTable.name},
          ${paymentMethodsTable.code},
          ${categoriesTable.name},
          ${merchantsTable.name},
          entry_rollup.account_names,
          tag_rollup.tag_names
        ) as search_blob
      from ${transactionsTable}
      inner join entry_rollup
        on entry_rollup.transaction_id = ${transactionsTable.id}
      left join ${creditCardPurchasesTable}
        on ${creditCardPurchasesTable.transactionId} = ${transactionsTable.id}
      left join ${creditCardPaymentsTable}
        on ${creditCardPaymentsTable.transactionId} = ${transactionsTable.id}
      left join ${paymentMethodsTable}
        on ${paymentMethodsTable.id} = ${transactionsTable.paymentMethodId}
      left join ${categoriesTable}
        on ${categoriesTable.id} = ${transactionsTable.categoryId}
      left join ${merchantsTable}
        on ${merchantsTable.id} = ${transactionsTable.merchantId}
      left join tag_rollup
        on tag_rollup.transaction_id = ${transactionsTable.id}
      where ${transactionsTable.householdId} = ${householdId}
        and ${creditCardPurchasesTable.id} is null
    ),
    credit_card_installments as (
      select
        ${creditCardInstallmentsTable.id} as row_id,
        'credit_card_installment' as row_kind,
        ${transactionsTable.id} as transaction_id,
        ${creditCardInstallmentsTable.id} as installment_id,
        'credit_card_installment' as origin_type,
        ${transactionsTable.description} as description,
        ${transactionsTable.purchaseDate} as purchase_date,
        ${creditCardBillingCyclesTable.closingDate} as posted_date,
        ${creditCardInstallmentsTable.createdAt} as created_at,
        ${transactionsTable.updatedAt} as updated_at,
        ${creditCardInstallmentsTable.amount}::integer as amount,
        ${transactionsTable.includeInBudget} as include_in_budget,
        false as excluded_from_spending,
        ${transactionsTable.categoryId} as category_id,
        ${transactionsTable.merchantId} as merchant_id,
        ${paymentMethodsTable.code} as payment_method_code,
        ${creditCardsTable.id} as credit_card_id,
        array[${creditCardsTable.accountId}]::uuid[] as account_ids,
        array[${accountsTable.currencyId}]::text[] as currency_codes,
        coalesce(tag_rollup.tag_ids, array[]::uuid[]) as tag_ids,
        concat_ws(
          ' ',
          ${transactionsTable.description},
          'credit_card_installment',
          ${accountsTable.name},
          ${paymentMethodsTable.name},
          ${paymentMethodsTable.code},
          ${categoriesTable.name},
          ${merchantsTable.name},
          tag_rollup.tag_names
        ) as search_blob
      from ${creditCardInstallmentsTable}
      inner join ${creditCardPurchasesTable}
        on ${creditCardPurchasesTable.id} = ${creditCardInstallmentsTable.purchaseId}
      inner join ${creditCardsTable}
        on ${creditCardsTable.id} = ${creditCardInstallmentsTable.creditCardId}
      inner join ${transactionsTable}
        on ${transactionsTable.id} = ${creditCardPurchasesTable.transactionId}
       and ${transactionsTable.householdId} = ${householdId}
      inner join ${creditCardBillingCyclesTable}
        on ${creditCardBillingCyclesTable.id} = ${creditCardInstallmentsTable.billingCycleId}
      inner join ${accountsTable}
        on ${accountsTable.id} = ${creditCardsTable.accountId}
      left join ${paymentMethodsTable}
        on ${paymentMethodsTable.id} = ${transactionsTable.paymentMethodId}
      left join ${categoriesTable}
        on ${categoriesTable.id} = ${transactionsTable.categoryId}
      left join ${merchantsTable}
        on ${merchantsTable.id} = ${transactionsTable.merchantId}
      left join tag_rollup
        on tag_rollup.transaction_id = ${transactionsTable.id}
    ),
    feed as (
      select * from standard_transactions
      union all
      select * from credit_card_installments
    ),
    filtered as (
      select *
      from feed
      ${whereClause}
    )
  `;
}
