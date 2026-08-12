import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { buildTransactionFeedCte, type TransactionFilterQuery } from './transactions.query';

export type TransactionAnalyticsAggregateRow = {
  date: string;
  originType: 'income' | 'expense' | 'credit_card_installment';
  amount: number;
  currencyCode: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
};

export async function aggregateTransactionFeed(
  householdId: string,
  query: TransactionFilterQuery,
  maxPostedDate: string,
): Promise<TransactionAnalyticsAggregateRow[]> {
  const feedCte = buildTransactionFeedCte(householdId, query, { maxPostedDate });
  const result = await db.execute<TransactionAnalyticsAggregateRow>(sql`
    ${feedCte}
    select
      filtered.posted_date::text as date,
      filtered.origin_type as "originType",
      filtered.currency_codes[1] as "currencyCode",
      filtered.category_id as "categoryId",
      categories.name as "categoryName",
      categories.icon as "categoryIcon",
      categories.color as "categoryColor",
      sum(filtered.amount)::integer as amount
    from filtered
    left join categories on categories.id = filtered.category_id
    where filtered.origin_type in ('income', 'expense', 'credit_card_installment')
      and (
        filtered.origin_type = 'income'
        or filtered.include_in_budget
      )
    group by
      filtered.posted_date,
      filtered.origin_type,
      filtered.currency_codes[1],
      filtered.category_id,
      categories.name,
      categories.icon,
      categories.color
    order by filtered.posted_date asc
  `);

  return result.rows.map((row) => ({
    ...row,
    amount: Number(row.amount),
  }));
}

export type UpcomingInstallmentRow = {
  sourceId: string;
  parentId: string;
  transactionId: string;
  description: string;
  effectiveDate: string;
  amount: number;
  currencyCode: string;
  accountId: string | null;
  accountName: string | null;
  creditCardId: string | null;
  creditCardName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  merchantId: string | null;
  merchantName: string | null;
  installmentNumber: number | null;
  installmentCount: number | null;
};

export async function listUpcomingInstallments(
  householdId: string,
  query: TransactionFilterQuery,
  fromDate: string,
  toDate: string,
): Promise<UpcomingInstallmentRow[]> {
  const feedCte = buildTransactionFeedCte(householdId, {
    ...query,
    dateFrom: fromDate,
    dateTo: toDate,
  });
  const result = await db.execute<UpcomingInstallmentRow>(sql`
    ${feedCte}
    select
      filtered.installment_id as "sourceId",
      filtered.purchase_id as "parentId",
      filtered.transaction_id as "transactionId",
      filtered.description,
      filtered.posted_date::text as "effectiveDate",
      filtered.amount::integer as amount,
      filtered.currency_codes[1] as "currencyCode",
      filtered.account_ids[1] as "accountId",
      credit_cards_account.name as "accountName",
      filtered.credit_card_id as "creditCardId",
      credit_cards_account.name as "creditCardName",
      filtered.category_id as "categoryId",
      categories.name as "categoryName",
      filtered.merchant_id as "merchantId",
      merchants.name as "merchantName",
      filtered.installment_number as "installmentNumber",
      filtered.installment_count as "installmentCount"
    from filtered
    left join credit_cards on credit_cards.id = filtered.credit_card_id
    left join accounts credit_cards_account on credit_cards_account.id = credit_cards.ledger_account_id
    left join categories on categories.id = filtered.category_id
    left join merchants on merchants.id = filtered.merchant_id
    where filtered.origin_type = 'credit_card_installment'
    order by filtered.posted_date asc, filtered.row_id asc
  `);

  return result.rows.map((row) => ({ ...row, amount: Number(row.amount) }));
}
