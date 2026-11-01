import { sql } from "drizzle-orm";
import { db } from "@/db";

export type InsightsRow = {
  date: string;
  type: "expense" | "income" | "transfer" | "adjustment";
  direction: 1 | -1;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  amount: number;
  count: number;
};

/**
 * Entries of one account ledger, summed per day, transaction type, direction and category. The
 * amounts keep the ledger's raw sign; the service applies the account's displayed sign.
 */
export async function listLedgerRows(
  householdId: string,
  ledgerAccountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<InsightsRow[]> {
  const result = await db.execute<InsightsRow>(sql`
    select
      transactions.posted_date::text as date,
      transactions.type as type,
      case when entries.amount > 0 then 1 else -1 end as direction,
      entries.category_id as "categoryId",
      categories.name as "categoryName",
      categories.icon as "categoryIcon",
      categories.color as "categoryColor",
      sum(entries.amount)::bigint as amount,
      count(*)::integer as count
    from entries
    inner join transactions on transactions.id = entries.transaction_id
    left join categories on categories.id = entries.category_id
    where entries.ledger_account_id = ${ledgerAccountId}
      and transactions.household_id = ${householdId}
      and transactions.posted_date >= ${dateFrom}::date
      and transactions.posted_date <= ${dateTo}::date
    group by
      transactions.posted_date,
      transactions.type,
      case when entries.amount > 0 then 1 else -1 end,
      entries.category_id,
      categories.name,
      categories.icon,
      categories.color
    order by transactions.posted_date asc
  `);
  return result.rows.map((row) => ({
    ...row,
    amount: Number(row.amount),
    direction: Number(row.direction) as 1 | -1,
  }));
}

/** Raw ledger balance of the account from entries posted strictly before `date`. */
export async function sumBefore(
  householdId: string,
  ledgerAccountId: string,
  date: string,
): Promise<number> {
  const result = await db.execute<{ total: string | null }>(sql`
    select coalesce(sum(entries.amount), 0)::bigint as total
    from entries
    inner join transactions on transactions.id = entries.transaction_id
    where entries.ledger_account_id = ${ledgerAccountId}
      and transactions.household_id = ${householdId}
      and transactions.posted_date < ${date}::date
  `);
  return Number(result.rows[0]?.total ?? 0);
}

export async function firstPostedDate(
  householdId: string,
  ledgerAccountId: string,
): Promise<string | null> {
  const result = await db.execute<{ date: string | null }>(sql`
    select min(transactions.posted_date)::text as date
    from entries
    inner join transactions on transactions.id = entries.transaction_id
    where entries.ledger_account_id = ${ledgerAccountId}
      and transactions.household_id = ${householdId}
  `);
  return result.rows[0]?.date ?? null;
}

export type InsightsMerchantRow = {
  id: string | null;
  name: string;
  amount: number;
  count: number;
};

export type InsightsLargestExpenseRow = { description: string; amount: number; date: string };

/** Expenses paid from the account, by merchant (largest first) and the single largest one. */
export async function listExpenseHighlights(
  householdId: string,
  ledgerAccountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<{ merchants: InsightsMerchantRow[]; largest: InsightsLargestExpenseRow | null }> {
  const merchants = await db.execute<InsightsMerchantRow>(sql`
    select
      transactions.merchant_id as id,
      coalesce(merchants.name, 'No merchant') as name,
      sum(abs(entries.amount))::bigint as amount,
      count(*)::integer as count
    from entries
    inner join transactions on transactions.id = entries.transaction_id
    left join merchants on merchants.id = transactions.merchant_id
    where entries.ledger_account_id = ${ledgerAccountId}
      and transactions.household_id = ${householdId}
      and transactions.type = 'expense'
      and entries.amount < 0
      and transactions.posted_date >= ${dateFrom}::date
      and transactions.posted_date <= ${dateTo}::date
      and transactions.merchant_id is not null
    group by transactions.merchant_id, merchants.name
    order by sum(abs(entries.amount)) desc, merchants.name asc
    limit 5
  `);
  const largest = await db.execute<InsightsLargestExpenseRow>(sql`
    select
      transactions.description as description,
      abs(entries.amount)::bigint as amount,
      transactions.posted_date::text as date
    from entries
    inner join transactions on transactions.id = entries.transaction_id
    where entries.ledger_account_id = ${ledgerAccountId}
      and transactions.household_id = ${householdId}
      and transactions.type = 'expense'
      and entries.amount < 0
      and transactions.posted_date >= ${dateFrom}::date
      and transactions.posted_date <= ${dateTo}::date
    order by abs(entries.amount) desc, transactions.posted_date desc
    limit 1
  `);
  const top = largest.rows[0];
  return {
    merchants: merchants.rows.map((row) => ({
      ...row,
      amount: Number(row.amount),
      count: Number(row.count),
    })),
    largest: top ? { ...top, amount: Number(top.amount) } : null,
  };
}
