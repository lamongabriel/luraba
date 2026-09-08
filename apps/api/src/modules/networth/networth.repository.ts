import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accountsTable } from "@/db/schemas/accounts.schema";
import { creditCardsTable } from "@/db/schemas/credit-cards.schema";
import { entriesTable } from "@/db/schemas/entries.schema";
import { ledgerAccountsTable } from "@/db/schemas/ledger-accounts.schema";

export type NetWorthAccountRow = {
  id: string;
  name: string;
  type: string;
  classification: "asset" | "liability";
  currencyCode: string;
  balance: number;
};

export async function listAccountBalances(householdId: string): Promise<NetWorthAccountRow[]> {
  const rows = await db
    .select({
      id: accountsTable.id,
      name: accountsTable.name,
      type: accountsTable.type,
      classification: accountsTable.classification,
      currencyCode: accountsTable.currencyId,
      rawBalance: sql<number>`coalesce(sum(${entriesTable.amount}), 0)::integer`,
    })
    .from(accountsTable)
    .innerJoin(
      ledgerAccountsTable,
      and(
        eq(ledgerAccountsTable.ownerId, accountsTable.id),
        eq(ledgerAccountsTable.ownerType, "account"),
      ),
    )
    .leftJoin(entriesTable, eq(entriesTable.ledgerAccountId, ledgerAccountsTable.id))
    .where(eq(accountsTable.householdId, householdId))
    .groupBy(accountsTable.id)
    .orderBy(asc(accountsTable.name));

  return rows.map((row) => ({
    ...row,
    balance: row.classification === "asset" ? Number(row.rawBalance) : -Number(row.rawBalance),
  }));
}

export async function listNetWorthHistory(
  householdId: string,
  dateFrom: string,
  dateTo: string,
  step: string,
): Promise<
  Array<{
    date: string;
    currencyCode: string;
    classification: "asset" | "liability";
    balance: number;
  }>
> {
  const result = await db.execute<{
    date: string;
    currencyCode: string;
    classification: "asset" | "liability";
    balance: number;
  }>(sql`
    with points as (
      select generate_series(${dateFrom}::date, ${dateTo}::date, ${sql.raw(`interval '${step}'`)})::date as point
    )
    select
      points.point as date,
      accounts.currency_id as "currencyCode",
      accounts.classification,
      coalesce(sum(entries.amount), 0)::integer as balance
    from points
    cross join accounts
    inner join ledger_accounts
      on ledger_accounts.owner_id = accounts.id
      and ledger_accounts.owner_type = 'account'
    left join entries on entries.ledger_account_id = ledger_accounts.id
    left join transactions on transactions.id = entries.transaction_id
      and transactions.posted_date <= points.point
    where accounts.household_id = ${householdId}
      and (entries.id is null or transactions.id is not null)
    group by points.point, accounts.currency_id, accounts.classification
    order by points.point asc
  `);

  return result.rows.map((row) => ({ ...row, balance: Number(row.balance) }));
}

export async function listCashFlow(
  householdId: string,
  dateFrom: string,
  dateTo: string,
): Promise<
  Array<{ date: string; type: "income" | "expense"; amount: number; currencyCode: string }>
> {
  const result = await db.execute<{
    date: string;
    type: "income" | "expense";
    amount: number;
    currencyCode: string;
  }>(sql`
    with ordinary as (
      select
        transactions.posted_date as date,
        transactions.type,
        abs(entries.amount)::integer as amount,
        entries.currency_id as "currencyCode"
      from transactions
      inner join entries on entries.transaction_id = transactions.id
      inner join ledger_accounts on ledger_accounts.id = entries.ledger_account_id
        and ledger_accounts.owner_type = 'account'
      where transactions.household_id = ${householdId}
        and transactions.type in ('income', 'expense')
        and transactions.posted_date between ${dateFrom}::date and ${dateTo}::date
    ), installments as (
      select
        credit_card_billing_cycles.closing_date as date,
        'expense'::text as type,
        credit_card_installments.amount::integer as amount,
        accounts.currency_id as "currencyCode"
      from credit_card_installments
      inner join credit_card_billing_cycles on credit_card_billing_cycles.id = credit_card_installments.billing_cycle_id
      inner join credit_card_purchases on credit_card_purchases.id = credit_card_installments.purchase_id
      inner join transactions on transactions.id = credit_card_purchases.transaction_id
      inner join credit_cards on credit_cards.id = credit_card_installments.credit_card_id
      inner join accounts on accounts.id = credit_cards.ledger_account_id
      where transactions.household_id = ${householdId}
        and credit_card_purchases.include_in_budget = true
        and credit_card_billing_cycles.closing_date between ${dateFrom}::date and ${dateTo}::date
    )
    select date, type, sum(amount)::integer as amount, "currencyCode"
    from (select * from ordinary union all select * from installments) flow
    group by date, type, "currencyCode"
    order by date asc
  `);
  return result.rows.map((row) => ({ ...row, amount: Number(row.amount) }));
}

export async function countTransfers(
  householdId: string,
  dateFrom: string,
  dateTo: string,
): Promise<number> {
  const result = await db.execute<{ count: number }>(sql`
    select count(*)::integer as count
    from transactions
    where household_id = ${householdId}
      and type = 'transfer'
      and posted_date between ${dateFrom}::date and ${dateTo}::date
  `);
  return Number(result.rows[0]?.count ?? 0);
}

export async function listCategoryBreakdown(
  householdId: string,
  dateFrom: string,
  dateTo: string,
  type: "expense" | "income",
): Promise<Array<{ id: string | null; name: string; amount: number; currencyCode: string }>> {
  const result = await db.execute<{
    id: string | null;
    name: string;
    amount: number;
    currencyCode: string;
  }>(sql`
    with ordinary as (
      select transactions.category_id as id, coalesce(categories.name, 'Uncategorized') as name,
        abs(entries.amount)::integer as amount, entries.currency_id as "currencyCode"
      from transactions
      inner join entries on entries.transaction_id = transactions.id
      inner join ledger_accounts on ledger_accounts.id = entries.ledger_account_id and ledger_accounts.owner_type = 'account'
      left join categories on categories.id = transactions.category_id
      where transactions.household_id = ${householdId}
        and transactions.type = ${type}
        and transactions.posted_date between ${dateFrom}::date and ${dateTo}::date
    ), installments as (
      select transactions.category_id as id, coalesce(categories.name, 'Uncategorized') as name,
        credit_card_installments.amount::integer as amount, accounts.currency_id as "currencyCode"
      from credit_card_installments
      inner join credit_card_purchases on credit_card_purchases.id = credit_card_installments.purchase_id
      inner join transactions on transactions.id = credit_card_purchases.transaction_id
      inner join credit_card_billing_cycles on credit_card_billing_cycles.id = credit_card_installments.billing_cycle_id
      inner join credit_cards on credit_cards.id = credit_card_installments.credit_card_id
      inner join accounts on accounts.id = credit_cards.ledger_account_id
      left join categories on categories.id = transactions.category_id
      where ${type === "expense" ? sql`transactions.household_id = ${householdId} and credit_card_purchases.include_in_budget = true and credit_card_billing_cycles.closing_date between ${dateFrom}::date and ${dateTo}::date` : sql`false`}
    )
    select id, name, sum(amount)::integer as amount, "currencyCode"
    from (select * from ordinary union all select * from installments) values
    group by id, name, "currencyCode"
    order by amount desc
  `);
  return result.rows.map((row) => ({ ...row, amount: Number(row.amount) }));
}

export async function listIncomeSources(
  householdId: string,
  dateFrom: string,
  dateTo: string,
): Promise<Array<{ id: string | null; name: string; amount: number; currencyCode: string }>> {
  const result = await db.execute<{
    id: string | null;
    name: string;
    amount: number;
    currencyCode: string;
  }>(sql`
    select transactions.merchant_id as id,
      coalesce(merchants.name, transactions.description) as name,
      sum(abs(entries.amount))::integer as amount,
      entries.currency_id as "currencyCode"
    from transactions
    inner join entries on entries.transaction_id = transactions.id
    inner join ledger_accounts on ledger_accounts.id = entries.ledger_account_id and ledger_accounts.owner_type = 'account'
    left join merchants on merchants.id = transactions.merchant_id
    where transactions.household_id = ${householdId}
      and transactions.type = 'income'
      and transactions.posted_date between ${dateFrom}::date and ${dateTo}::date
    group by transactions.merchant_id, merchants.name, transactions.description, entries.currency_id
    order by amount desc
  `);
  return result.rows.map((row) => ({ ...row, amount: Number(row.amount) }));
}

export async function listCreditCardBalances(householdId: string): Promise<
  Array<{
    id: string;
    name: string;
    brand: string;
    last4: string;
    currencyCode: string;
    creditLimitAmount: number;
    balance: number;
  }>
> {
  const result = await db
    .select({
      id: creditCardsTable.id,
      name: accountsTable.name,
      brand: creditCardsTable.brand,
      last4: creditCardsTable.last4,
      currencyCode: accountsTable.currencyId,
      creditLimitAmount: creditCardsTable.creditLimitAmount,
      rawBalance: sql<number>`coalesce(sum(${entriesTable.amount}), 0)::integer`,
    })
    .from(creditCardsTable)
    .innerJoin(accountsTable, eq(accountsTable.id, creditCardsTable.ledgerAccountId))
    .innerJoin(
      ledgerAccountsTable,
      and(
        eq(ledgerAccountsTable.ownerId, accountsTable.id),
        eq(ledgerAccountsTable.ownerType, "account"),
      ),
    )
    .leftJoin(entriesTable, eq(entriesTable.ledgerAccountId, ledgerAccountsTable.id))
    .where(eq(creditCardsTable.householdId, householdId))
    .groupBy(creditCardsTable.id, accountsTable.id)
    .orderBy(asc(accountsTable.name));
  return result.map((row) => ({
    ...row,
    balance: -Number(row.rawBalance),
    creditLimitAmount: Number(row.creditLimitAmount),
  }));
}
