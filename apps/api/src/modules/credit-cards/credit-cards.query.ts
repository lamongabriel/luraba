import type {
  listCreditCardCyclesQuerySchema,
  listCreditCardsQuerySchema,
} from "@luraba/contracts/credit-cards";
import { eq, type SQL, sql } from "drizzle-orm";
import type { z } from "zod";
import { creditCardsTable } from "@/db/schemas/credit-cards.schema";
import {
  buildIlikeSearch,
  buildOrderBy,
  combineConditions,
  inArrayIfAny,
  rangeConditions,
} from "@/shared/list";
import { creditCardOwnerAccountsTable } from "./credit-cards.helpers";

export type ListCreditCardsQuery = z.output<typeof listCreditCardsQuerySchema>;

export function buildCreditCardsListWhere(
  householdId: string,
  query: ListCreditCardsQuery,
  displayedBalance: SQL,
): SQL {
  return combineConditions(
    eq(creditCardsTable.householdId, householdId),
    buildIlikeSearch(query.search, [
      sql`${creditCardsTable.name}`,
      sql`${creditCardsTable.institutionName}`,
      sql`${creditCardsTable.notes}`,
      sql`${creditCardOwnerAccountsTable.name}`,
      sql`${creditCardOwnerAccountsTable.institutionName}`,
      sql`${creditCardsTable.brand}`,
      sql`${creditCardsTable.last4}`,
      sql`${creditCardOwnerAccountsTable.currencyId}`,
    ]),
    inArrayIfAny(creditCardsTable.brand, query.brands),
    inArrayIfAny(creditCardOwnerAccountsTable.currencyId, query.currencyCodes),
    inArrayIfAny(creditCardsTable.ownerAccountId, query.ownerAccountIds),
    inArrayIfAny(creditCardsTable.closingDay, query.closingDays),
    inArrayIfAny(creditCardsTable.dueDay, query.dueDays),
    ...rangeConditions(displayedBalance, query.balanceMin, query.balanceMax),
    ...rangeConditions(
      creditCardsTable.creditLimitAmount,
      query.creditLimitMin,
      query.creditLimitMax,
    ),
    query.hasCreditLimit === undefined
      ? undefined
      : query.hasCreditLimit
        ? sql`${creditCardsTable.creditLimitAmount} >= 0`
        : sql`${creditCardsTable.creditLimitAmount} < 0`,
    ...rangeConditions(creditCardsTable.createdAt, query.createdAtFrom, query.createdAtTo),
    ...rangeConditions(creditCardsTable.updatedAt, query.updatedAtFrom, query.updatedAtTo),
  ) as SQL;
}

export function buildCreditCardsListOrder(
  query: ListCreditCardsQuery,
  displayedBalance: SQL,
): SQL[] {
  return buildOrderBy(
    query,
    {
      balance: displayedBalance,
      brand: sql`${creditCardsTable.brand}`,
      closingDay: sql`${creditCardsTable.closingDay}`,
      createdAt: sql`${creditCardsTable.createdAt}`,
      creditLimitAmount: sql`${creditCardsTable.creditLimitAmount}`,
      currencyCode: sql`${creditCardOwnerAccountsTable.currencyId}`,
      dueDay: sql`${creditCardsTable.dueDay}`,
      institutionName: sql`${creditCardsTable.institutionName}`,
      last4: sql`${creditCardsTable.last4}`,
      name: sql`${creditCardsTable.name}`,
      updatedAt: sql`${creditCardsTable.updatedAt}`,
    },
    [sql`${creditCardsTable.name} asc`, sql`${creditCardsTable.id} asc`],
  );
}

export type ListCreditCardCyclesQuery = z.output<typeof listCreditCardCyclesQuerySchema>;

export function buildCreditCardCyclesListWhere(query: ListCreditCardCyclesQuery): SQL | undefined {
  return combineConditions(
    query.scope === "default" ? sql`(is_current or is_next or has_activity)` : undefined,
    buildIlikeSearch(query.search, [sql`status`, sql`display_status`]),
    inArrayIfAny(sql`status`, query.statuses),
    inArrayIfAny(sql`display_status`, query.displayStatuses),
    ...rangeConditions(sql`closing_date`, query.closingDateFrom, query.closingDateTo),
    ...rangeConditions(sql`due_date`, query.dueDateFrom, query.dueDateTo),
    ...rangeConditions(sql`statement_amount`, query.statementAmountMin, query.statementAmountMax),
    ...rangeConditions(sql`paid_amount`, query.paidAmountMin, query.paidAmountMax),
    ...rangeConditions(sql`remaining_amount`, query.remainingAmountMin, query.remainingAmountMax),
  );
}

export function buildCreditCardCyclesListOrder(query: ListCreditCardCyclesQuery): SQL[] {
  return buildOrderBy(
    query,
    {
      closingDate: sql`closing_date`,
      displayStatus: sql`display_status`,
      dueDate: sql`due_date`,
      paidAmount: sql`paid_amount`,
      periodEnd: sql`period_end`,
      periodStart: sql`period_start`,
      remainingAmount: sql`remaining_amount`,
      statementAmount: sql`statement_amount`,
      status: sql`status`,
    },
    [sql`closing_date desc`, sql`id asc`],
  );
}

export function buildCreditCardCyclesCte(
  creditCardId: string,
  today: Date,
  query: ListCreditCardCyclesQuery,
): SQL {
  const where = buildCreditCardCyclesListWhere(query);
  const whereClause = where ? sql`where ${where}` : sql``;

  return sql`
    with cycle_amounts as (
      select
        cycles.id,
        cycles.credit_card_id,
        cycles.period_start,
        cycles.period_end,
        cycles.closing_date,
        cycles.due_date,
        cycles.status,
        coalesce(installments.statement_amount, 0)::integer as statement_amount,
        coalesce(payments.paid_amount, 0)::integer as paid_amount,
        cycles.created_at,
        cycles.updated_at
      from credit_card_billing_cycles cycles
      left join (
        select billing_cycle_id, sum(amount)::integer as statement_amount
        from credit_card_installments
        group by billing_cycle_id
      ) installments on installments.billing_cycle_id = cycles.id
      left join (
        select
          allocations.billing_cycle_id,
          payments.credit_card_id,
          sum(allocations.amount)::integer as paid_amount
        from credit_card_payment_allocations allocations
        inner join credit_card_payments payments on payments.id = allocations.payment_id
        group by allocations.billing_cycle_id, payments.credit_card_id
      ) payments
        on payments.billing_cycle_id = cycles.id
       and payments.credit_card_id = cycles.credit_card_id
      where cycles.credit_card_id = ${creditCardId}
    ),
    computed as (
      select
        *,
        greatest(statement_amount - paid_amount, 0)::integer as remaining_amount,
        (period_start <= ${today}::date and period_end >= ${today}::date) as is_current,
        id = (
          select next_cycle.id
          from credit_card_billing_cycles next_cycle
          where next_cycle.credit_card_id = ${creditCardId}
            and next_cycle.period_start > ${today}::date
          order by next_cycle.period_start asc
          limit 1
        ) as is_next,
        (
          statement_amount > 0
          or paid_amount > 0
          or greatest(statement_amount - paid_amount, 0) > 0
        ) as has_activity,
        case
          when status = 'paid' then 'paid'
          when ${today}::date < period_start then 'upcoming'
          when greatest(statement_amount - paid_amount, 0) <= 0 and ${today}::date >= closing_date then 'paid'
          when period_start <= ${today}::date and period_end >= ${today}::date then 'current'
          when greatest(statement_amount - paid_amount, 0) <= 0 then 'paid'
          when ${today}::date > due_date then 'overdue'
          when ${today}::date > closing_date then 'due'
          else 'upcoming'
        end as display_status
      from cycle_amounts
    ),
    filtered as (
      select *
      from computed
      ${whereClause}
    )
  `;
}
