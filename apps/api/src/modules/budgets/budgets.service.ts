import type {
  BudgetInsights,
  MonthlyBudget,
  replaceMonthlyBudgetBodySchema,
  updateBudgetMonthSettingsBodySchema,
} from "@luraba/contracts/budgets";
import { shiftMonthKey } from "@luraba/domain";
import type { z } from "zod";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { categoriesRepository } from "@/modules/categories/categories.repository";
import { restampMonthPurchases } from "@/modules/credit-cards/credit-card-cycles.service";
import { fxService } from "@/modules/fx/fx.service";
import { householdsRepository } from "@/modules/households/households.repository";
import { NotFoundError, ValidationError } from "@/shared/errors";
import { budgetMonthSettingsRepository } from "./budget-month-settings.repository";
import { budgetsRepository } from "./budgets.repository";
import { getMonthBudgetSettings } from "./budgets.settings";
import { formatBudgetMonthKey, parseBudgetMonthKey } from "./budgets.types";

type ReplaceMonthlyBudget = z.output<typeof replaceMonthlyBudgetBodySchema>;
type UpdateBudgetMonthSettings = z.output<typeof updateBudgetMonthSettingsBodySchema>;

type BudgetRow = Awaited<ReturnType<typeof budgetsRepository.listMonthBudgets>>[number];
type ActualRow = Awaited<ReturnType<typeof budgetsRepository.listMonthActuals>>[number];
type CreditCardActualRow = Awaited<
  ReturnType<typeof budgetsRepository.listMonthCreditCardActuals>
>[number];
type CategorizedActualRow = (ActualRow | CreditCardActualRow) & { categoryId: string };

type BudgetCategoryItem = MonthlyBudget["categories"]["income"][number];

function buildCategoryGroupKey(categoryType: "income" | "expense", categoryId: string): string {
  return `${categoryType}:${categoryId}`;
}

function getOrCreateCategoryBreakdown(
  categoryMap: Record<"income" | "expense", Map<string, BudgetCategoryItem>>,
  row: Pick<BudgetRow, "categoryId" | "categoryName" | "parentId" | "categoryType">,
): BudgetCategoryItem {
  const target = categoryMap[row.categoryType];
  const existing = target.get(row.categoryId);

  if (existing) {
    return existing;
  }

  const created: BudgetCategoryItem = {
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    parentId: row.parentId ?? null,
    budgetedAmount: 0,
    actualAmount: 0,
  };

  target.set(row.categoryId, created);
  return created;
}

async function buildMonthlyBudgetResponse(params: {
  month: Date;
  budgetCurrencyCode: string;
  displayCurrencyCode: string;
  budgetRows: BudgetRow[];
  standardActualRows: ActualRow[];
  creditCardActualRows: CreditCardActualRow[];
  settings: MonthlyBudget["settings"];
}): Promise<MonthlyBudget> {
  const categories = {
    income: new Map<string, BudgetCategoryItem>(),
    expense: new Map<string, BudgetCategoryItem>(),
  };

  for (const row of params.budgetRows) {
    getOrCreateCategoryBreakdown(categories, row);
  }

  const categorizedActualRows = [
    ...params.standardActualRows,
    ...params.creditCardActualRows,
  ].filter((row): row is CategorizedActualRow => row.categoryId !== null);

  for (const row of categorizedActualRows) {
    getOrCreateCategoryBreakdown(categories, row);
  }

  const budgetedAmountsByCategory = await fxService.convertGroupedAmounts(
    params.budgetRows.map((row) => ({
      amount: row.amount,
      currencyCode: params.budgetCurrencyCode,
      effectiveDate: params.month,
      groupKey: buildCategoryGroupKey(row.categoryType, row.categoryId),
    })),
    params.displayCurrencyCode,
  );

  const actualAmountsByCategory = await fxService.convertGroupedAmounts(
    categorizedActualRows.map((row) => ({
      amount: row.actualAmount,
      currencyCode: row.currencyCode,
      effectiveDate: row.effectiveDate,
      groupKey: buildCategoryGroupKey(row.categoryType, row.categoryId),
    })),
    params.displayCurrencyCode,
  );

  for (const [categoryType, target] of Object.entries(categories) as Array<
    ["income" | "expense", Map<string, BudgetCategoryItem>]
  >) {
    for (const [categoryId, item] of target.entries()) {
      const groupKey = buildCategoryGroupKey(categoryType, categoryId);
      item.budgetedAmount = budgetedAmountsByCategory[groupKey] ?? 0;
      item.actualAmount = actualAmountsByCategory[groupKey] ?? 0;
    }
  }

  const income = Array.from(categories.income.values()).sort((a, b) =>
    a.categoryName.localeCompare(b.categoryName),
  );
  const expense = Array.from(categories.expense.values()).sort((a, b) =>
    a.categoryName.localeCompare(b.categoryName),
  );

  // A parent's budget is the cap for its subcategories, so their budgets are already inside it.
  const budgetedParents = new Set(
    expense.filter((item) => item.budgetedAmount > 0).map((item) => item.categoryId),
  );
  const expenseBudgeted = expense
    .filter((item) => !(item.parentId && budgetedParents.has(item.parentId)))
    .reduce((sum, item) => sum + item.budgetedAmount, 0);

  return {
    settings: params.settings,
    month: formatBudgetMonthKey(params.month),
    budgetCurrencyCode: params.budgetCurrencyCode,
    displayCurrencyCode: params.displayCurrencyCode,
    totals: {
      incomeBudgeted: income.reduce((sum, item) => sum + item.budgetedAmount, 0),
      incomeActual: income.reduce((sum, item) => sum + item.actualAmount, 0),
      expenseBudgeted,
      expenseActual: expense.reduce((sum, item) => sum + item.actualAmount, 0),
    },
    categories: {
      income,
      expense,
    },
  };
}

async function resolveBudgetContext(
  householdId: string,
  displayCurrencyOverride?: string,
): Promise<{
  budgetCurrencyCode: string;
  displayCurrencyCode: string;
}> {
  const household = await householdsRepository.findHouseholdById(householdId);
  if (!household) throw new NotFoundError("Household");

  const budgetCurrencyCode = household.defaultCurrencyId;
  const displayCurrencyCode = (
    displayCurrencyOverride ?? household.defaultCurrencyId
  ).toUpperCase();

  await fxService.assertCurrencyExists(displayCurrencyCode);

  return {
    budgetCurrencyCode,
    displayCurrencyCode,
  };
}

export async function getMonthlyBudget(
  context: HouseholdContext,
  month: Date,
  displayCurrencyOverride?: string,
): Promise<MonthlyBudget> {
  const { budgetCurrencyCode, displayCurrencyCode } = await resolveBudgetContext(
    context.householdId,
    displayCurrencyOverride,
  );

  const [budgetRows, standardActualRows, creditCardActualRows, settings] = await Promise.all([
    budgetsRepository.listMonthBudgets(context.householdId, month),
    budgetsRepository.listMonthActuals(context.householdId, month),
    budgetsRepository.listMonthCreditCardActuals(context.householdId, month),
    getMonthBudgetSettings(context, month),
  ]);

  return buildMonthlyBudgetResponse({
    month,
    budgetCurrencyCode,
    displayCurrencyCode,
    budgetRows,
    standardActualRows,
    creditCardActualRows,
    settings,
  });
}

const INSIGHTS_HISTORY_MONTHS = 6;

/**
 * The last months of expenses against their budget (oldest first, ending with `month`) and the
 * categories with spending in `month` (biggest first), each compared with the month before. Every month is
 * the same `getMonthlyBudget` the page uses, so the numbers always agree.
 */
export async function getBudgetInsights(
  context: HouseholdContext,
  month: Date,
  displayCurrencyOverride?: string,
): Promise<BudgetInsights> {
  const monthKey = formatBudgetMonthKey(month);
  const keys = Array.from({ length: INSIGHTS_HISTORY_MONTHS }, (_, index) =>
    shiftMonthKey(monthKey, index - (INSIGHTS_HISTORY_MONTHS - 1)),
  );
  const months = await Promise.all(
    keys.map((key) => getMonthlyBudget(context, parseBudgetMonthKey(key), displayCurrencyOverride)),
  );

  const current = months[months.length - 1];
  const previous = months[months.length - 2];
  if (!current || !previous) throw new NotFoundError("Budget");

  const previousByCategory = new Map(
    previous.categories.expense.map((item) => [item.categoryId, item.actualAmount]),
  );

  return {
    month: monthKey,
    budgetCurrencyCode: current.budgetCurrencyCode,
    displayCurrencyCode: current.displayCurrencyCode,
    history: months.map((item) => ({
      month: item.month,
      budgetedAmount: item.totals.expenseBudgeted,
      spentAmount: item.totals.expenseActual,
    })),
    mostExpenses: current.categories.expense
      .filter((item) => item.actualAmount > 0)
      .sort((a, b) => b.actualAmount - a.actualAmount)
      .map((item) => {
        const previousAmount = previousByCategory.get(item.categoryId) ?? 0;
        return {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          parentId: item.parentId,
          actualAmount: item.actualAmount,
          previousAmount,
          changePercent:
            previousAmount > 0
              ? Math.round(((item.actualAmount - previousAmount) / previousAmount) * 1000) / 10
              : null,
        };
      }),
  };
}

/**
 * Sets (or clears, with `null`) the credit-card overrides for a month and re-stamps that month's
 * card purchases so the budget reflects them straight away.
 */
export async function updateBudgetMonthSettings(
  context: HouseholdContext,
  month: Date,
  dto: UpdateBudgetMonthSettings,
): Promise<MonthlyBudget> {
  await db.transaction(async (tx) => {
    await budgetMonthSettingsRepository.saveForMonth(tx, context, month, {
      month,
      creditExpenseTiming: dto.creditExpenseTiming,
      creditInstallmentBudgetMode: dto.creditInstallmentBudgetMode,
    });

    const effective = await getMonthBudgetSettings(context, month, tx);
    await restampMonthPurchases(tx, context.householdId, month, {
      timing: effective.creditExpenseTiming,
      mode: effective.creditInstallmentBudgetMode,
    });
  });

  return getMonthlyBudget(context, month);
}

export async function replaceMonthlyBudget(
  context: HouseholdContext,
  month: Date,
  dto: ReplaceMonthlyBudget,
): Promise<MonthlyBudget> {
  const { budgetCurrencyCode } = await resolveBudgetContext(context.householdId);

  const duplicates = new Set<string>();
  const allCategoryIds = [
    ...dto.income.map((item) => item.categoryId),
    ...dto.expense.map((item) => item.categoryId),
  ];
  for (const categoryId of allCategoryIds) {
    if (duplicates.has(categoryId)) {
      throw new ValidationError(
        `Category ${categoryId} appears more than once in this budget payload`,
      );
    }

    duplicates.add(categoryId);
  }

  const categories = await categoriesRepository.findByIds(context, allCategoryIds);
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  for (const item of dto.income) {
    const category = categoriesById.get(item.categoryId);
    if (!category) throw new NotFoundError("Category");
    if (category.type !== "income") {
      throw new ValidationError(`Category ${item.categoryId} must be of type income`);
    }
  }

  for (const item of dto.expense) {
    const category = categoriesById.get(item.categoryId);
    if (!category) throw new NotFoundError("Category");
    if (category.type !== "expense") {
      throw new ValidationError(`Category ${item.categoryId} must be of type expense`);
    }
  }

  // A parent's budget caps its subcategories: together they cannot plan more than the parent.
  const amountById = new Map(dto.expense.map((item) => [item.categoryId, item.amount]));
  const allocated = new Map<string, number>();
  for (const item of dto.expense) {
    const parentId = categoriesById.get(item.categoryId)?.parentId;
    if (parentId && (amountById.get(parentId) ?? 0) > 0) {
      allocated.set(parentId, (allocated.get(parentId) ?? 0) + item.amount);
    }
  }
  for (const [parentId, total] of allocated) {
    if (total > (amountById.get(parentId) ?? 0)) {
      const name = categoriesById.get(parentId)?.name ?? "the parent category";
      throw new ValidationError(
        `The subcategory budgets under ${name} add up to more than the ${name} budget. Lower them or raise the ${name} budget.`,
      );
    }
  }

  await db.transaction(async (tx) => {
    await budgetsRepository.replaceMonthBudgets(tx, context, month, [
      ...dto.income.map((item) => ({
        categoryId: item.categoryId,
        amount: item.amount,
      })),
      ...dto.expense.map((item) => ({
        categoryId: item.categoryId,
        amount: item.amount,
      })),
    ]);
  });

  return getMonthlyBudget(context, month, budgetCurrencyCode);
}
