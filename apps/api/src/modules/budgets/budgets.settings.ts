import type { BudgetMonthSettings } from "@luraba/contracts/budgets";
import type { HouseholdContext } from "@/config/permissions";
import type { DbExecutor } from "@/shared/repositories/household-scoped.repository";
import type {
  CreditExpenseTiming,
  CreditInstallmentBudgetMode,
} from "@/shared/validation/preferences";
import { budgetMonthSettingsRepository } from "./budget-month-settings.repository";

export type EffectiveCreditBudgetSettings = {
  timing: CreditExpenseTiming;
  mode: CreditInstallmentBudgetMode;
};

/**
 * The credit-card budget settings for purchases posted in `month`: the month's override when it has
 * one, otherwise the household default. This is the only place that decides which wins.
 */
export async function getMonthBudgetSettings(
  context: HouseholdContext,
  month: Date,
  executor?: DbExecutor,
): Promise<BudgetMonthSettings> {
  const override = await budgetMonthSettingsRepository.findByMonth(context, month, executor);
  const overrideTiming = override?.creditExpenseTiming ?? null;
  const overrideMode = override?.creditInstallmentBudgetMode ?? null;

  return {
    overrideCreditExpenseTiming: overrideTiming,
    overrideCreditInstallmentBudgetMode: overrideMode,
    creditExpenseTiming: overrideTiming ?? context.creditExpenseTiming,
    creditInstallmentBudgetMode: overrideMode ?? context.creditInstallmentBudgetMode,
    defaultCreditExpenseTiming: context.creditExpenseTiming,
    defaultCreditInstallmentBudgetMode: context.creditInstallmentBudgetMode,
  };
}

export async function resolveCreditBudgetSettings(
  context: HouseholdContext,
  month: Date,
  executor?: DbExecutor,
): Promise<EffectiveCreditBudgetSettings> {
  const settings = await getMonthBudgetSettings(context, month, executor);
  return { timing: settings.creditExpenseTiming, mode: settings.creditInstallmentBudgetMode };
}
