import type { MonthlyBudget, replaceMonthlyBudgetBodySchema } from "@luraba/contracts/budgets";
import type { z } from "zod";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { categoriesRepository } from "@/modules/categories/categories.repository";
import { fxService } from "@/modules/fx/fx.service";
import { householdsRepository } from "@/modules/households/households.repository";
import { NotFoundError, ValidationError } from "@/shared/errors";
import { budgetsRepository } from "./budgets.repository";
import { formatBudgetMonthKey } from "./budgets.types";

type ReplaceMonthlyBudget = z.output<typeof replaceMonthlyBudgetBodySchema>;

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

  return {
    month: formatBudgetMonthKey(params.month),
    budgetCurrencyCode: params.budgetCurrencyCode,
    displayCurrencyCode: params.displayCurrencyCode,
    totals: {
      incomeBudgeted: income.reduce((sum, item) => sum + item.budgetedAmount, 0),
      incomeActual: income.reduce((sum, item) => sum + item.actualAmount, 0),
      expenseBudgeted: expense.reduce((sum, item) => sum + item.budgetedAmount, 0),
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

  const [budgetRows, standardActualRows, creditCardActualRows] = await Promise.all([
    budgetsRepository.listMonthBudgets(context.householdId, month),
    budgetsRepository.listMonthActuals(context.householdId, month),
    budgetsRepository.listMonthCreditCardActuals(context.householdId, month),
  ]);

  return buildMonthlyBudgetResponse({
    month,
    budgetCurrencyCode,
    displayCurrencyCode,
    budgetRows,
    standardActualRows,
    creditCardActualRows,
  });
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
