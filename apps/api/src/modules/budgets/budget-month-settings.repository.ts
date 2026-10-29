import { budgetMonthSettingsTable } from "@luraba/db/schemas/budget-month-settings.schema";
import { and, eq } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import {
  type DbExecutor,
  HouseholdScopedRepository,
} from "@/shared/repositories/household-scoped.repository";

export type BudgetMonthSettingsRecord = typeof budgetMonthSettingsTable.$inferSelect;
type CreateBudgetMonthSettingsValues = Omit<
  typeof budgetMonthSettingsTable.$inferInsert,
  "id" | "householdId" | "createdAt" | "updatedAt"
>;

class BudgetMonthSettingsRepository extends HouseholdScopedRepository<
  BudgetMonthSettingsRecord,
  CreateBudgetMonthSettingsValues
> {
  constructor() {
    super(budgetMonthSettingsTable, { orderBy: budgetMonthSettingsTable.month });
  }

  async findByMonth(
    context: HouseholdContext,
    month: Date,
    executor: DbExecutor = db,
  ): Promise<BudgetMonthSettingsRecord | undefined> {
    const [row] = await executor
      .select()
      .from(budgetMonthSettingsTable)
      .where(
        and(
          eq(budgetMonthSettingsTable.householdId, context.householdId),
          eq(budgetMonthSettingsTable.month, month),
        ),
      );
    return row;
  }

  /** Sets a month's overrides; a month with no override left has its row removed. */
  async saveForMonth(
    executor: DbExecutor,
    context: HouseholdContext,
    month: Date,
    values: CreateBudgetMonthSettingsValues,
  ): Promise<void> {
    const existing = await this.findByMonth(context, month, executor);
    const clearsEverything =
      values.creditExpenseTiming == null && values.creditInstallmentBudgetMode == null;

    if (!existing) {
      if (!clearsEverything) await this.create(context, { ...values, month }, executor);
      return;
    }
    if (clearsEverything) {
      await this.delete(existing.id, context, executor);
      return;
    }
    await this.update(existing.id, context, values, executor);
  }
}

export const budgetMonthSettingsRepository = new BudgetMonthSettingsRepository();
