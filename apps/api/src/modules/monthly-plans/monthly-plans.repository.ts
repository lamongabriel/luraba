import { categoriesTable } from "@luraba/db/schemas/categories.schema";
import { householdsTable } from "@luraba/db/schemas/households.schema";
import { monthlyPlanLinesTable } from "@luraba/db/schemas/monthly-plans.schema";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { HouseholdScopedRepository } from "@/shared/repositories/household-scoped.repository";

export type MonthlyPlanLineRecord = typeof monthlyPlanLinesTable.$inferSelect;
type CreateLineValues = Omit<
  typeof monthlyPlanLinesTable.$inferInsert,
  "id" | "householdId" | "createdAt" | "updatedAt"
>;

/** A salary or tax transaction with the competency month it belongs to (`YYYY-MM`). */
export type CompetencyRow = {
  transactionId: string;
  postedDate: string;
  month: string;
  amount: number;
  currencyCode: string;
};

class MonthlyPlansRepository extends HouseholdScopedRepository<
  MonthlyPlanLineRecord,
  CreateLineValues
> {
  constructor() {
    super(monthlyPlanLinesTable, { orderBy: monthlyPlanLinesTable.month });
  }

  async listBetween(context: HouseholdContext, from: Date, to: Date) {
    return db
      .select()
      .from(monthlyPlanLinesTable)
      .where(
        and(
          eq(monthlyPlanLinesTable.householdId, context.householdId),
          gte(monthlyPlanLinesTable.month, from),
          lte(monthlyPlanLinesTable.month, to),
        ),
      );
  }

  /** Replaces every line of the given months in one database transaction. */
  async replaceMonths(context: HouseholdContext, months: Date[], lines: CreateLineValues[]) {
    await db.transaction(async (tx) => {
      await tx
        .delete(monthlyPlanLinesTable)
        .where(
          and(
            eq(monthlyPlanLinesTable.householdId, context.householdId),
            inArray(monthlyPlanLinesTable.month, months),
          ),
        );
      if (lines.length > 0) {
        await tx
          .insert(monthlyPlanLinesTable)
          .values(lines.map((line) => ({ ...line, householdId: context.householdId })));
      }
    });
  }

  async findCategoryId(context: HouseholdContext, name: string): Promise<string | null> {
    const [row] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(
        and(eq(categoriesTable.householdId, context.householdId), eq(categoriesTable.name, name)),
      )
      .limit(1);
    return row?.id ?? null;
  }

  async defaultCurrency(context: HouseholdContext): Promise<string> {
    const [row] = await db
      .select({ code: householdsTable.defaultCurrencyId })
      .from(householdsTable)
      .where(eq(householdsTable.id, context.householdId));
    return row?.code ?? "USD";
  }

  /**
   * Income or expense entries of one category with their competency month: the transaction's own
   * `competency_month`, else (income only) the next month when received on or after
   * `nextMonthFromDay`, else the posted month. Expenses come back as positive amounts.
   */
  async listCategoryByCompetency(
    context: HouseholdContext,
    categoryId: string,
    type: "income" | "expense",
    nextMonthFromDay: number,
  ): Promise<CompetencyRow[]> {
    const shifts = type === "income";
    const result = await db.execute<{
      transactionId: string;
      postedDate: string;
      month: string;
      amount: string;
      currencyCode: string;
    }>(sql`
      select
        t.id as "transactionId",
        t.posted_date::text as "postedDate",
        coalesce(
          to_char(t.competency_month, 'YYYY-MM'),
          case when ${shifts} and extract(day from t.posted_date) >= ${nextMonthFromDay}
            then to_char(t.posted_date + interval '1 month', 'YYYY-MM')
            else to_char(t.posted_date, 'YYYY-MM') end
        ) as month,
        (case when ${type} = 'expense' then -e.amount else e.amount end)::text as amount,
        e.currency_id as "currencyCode"
      from transactions t
      join entries e on e.transaction_id = t.id and e.category_id = ${categoryId}
      where t.household_id = ${context.householdId} and t.type = ${type}::transaction_type
      order by t.posted_date, t.created_at
    `);
    return result.rows.map((row) => ({ ...row, amount: Number(row.amount) }));
  }
}

export const monthlyPlansRepository = new MonthlyPlansRepository();
