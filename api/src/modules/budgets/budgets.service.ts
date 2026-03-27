import { db } from '@/db';
import { NotFoundError, ValidationError } from '@/shared/errors';
import * as budgetsRepository from './budgets.repository';
import { MonthlyBudgetResponse, ReplaceBudgetDto, formatMonthKey } from './budgets.types';

function buildMonthlyBudgetResponse(params: {
  month: Date;
  currencyCode: string;
  budgetRows: Awaited<ReturnType<typeof budgetsRepository.listMonthBudgets>>;
  standardActualRows: Awaited<ReturnType<typeof budgetsRepository.listMonthActuals>>;
  creditCardActualRows: Awaited<ReturnType<typeof budgetsRepository.listMonthCreditCardActuals>>;
}): MonthlyBudgetResponse {
  const categories = {
    income: new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        parentId: string | null;
        budgetedAmount: number;
        actualAmount: number;
      }
    >(),
    expense: new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        parentId: string | null;
        budgetedAmount: number;
        actualAmount: number;
      }
    >(),
  };

  for (const row of params.budgetRows) {
    const target = categories[row.categoryType];
    target.set(row.categoryId, {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      parentId: row.parentId ?? null,
      budgetedAmount: row.amount,
      actualAmount: 0,
    });
  }

  for (const row of [...params.standardActualRows, ...params.creditCardActualRows]) {
    if (!row.categoryId) {
      continue;
    }

    const target = categories[row.categoryType];
    const existing = target.get(row.categoryId);

    if (existing) {
      existing.actualAmount += row.actualAmount;
      continue;
    }

    target.set(row.categoryId, {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      parentId: row.parentId ?? null,
      budgetedAmount: 0,
      actualAmount: row.actualAmount,
    });
  }

  const income = Array.from(categories.income.values()).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  const expense = Array.from(categories.expense.values()).sort((a, b) => a.categoryName.localeCompare(b.categoryName));

  return {
    month: formatMonthKey(params.month),
    currencyCode: params.currencyCode,
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

async function resolveBudgetContext(userId: string, preferredCurrencyOverride?: string): Promise<{
  currencyCode: string;
}> {
  const user = await budgetsRepository.findUserBudgetContext(userId);
  if (!user) throw new NotFoundError('User');

  const currencyCode = preferredCurrencyOverride ?? user.preferredCurrency;
  const currency = await budgetsRepository.findCurrencyByCode(currencyCode);
  if (!currency) throw new NotFoundError('Currency');

  return { currencyCode };
}

export async function getMonthlyBudget(
  userId: string,
  month: Date,
  preferredCurrencyOverride?: string,
): Promise<MonthlyBudgetResponse> {
  const { currencyCode } = await resolveBudgetContext(userId, preferredCurrencyOverride);

  const [budgetRows, standardActualRows, creditCardActualRows] = await Promise.all([
    budgetsRepository.listMonthBudgets(userId, month, currencyCode),
    budgetsRepository.listMonthActuals(userId, month, currencyCode),
    budgetsRepository.listMonthCreditCardActuals(userId, month, currencyCode),
  ]);

  return buildMonthlyBudgetResponse({
    month,
    currencyCode,
    budgetRows,
    standardActualRows,
    creditCardActualRows,
  });
}

export async function replaceMonthlyBudget(
  userId: string,
  month: Date,
  dto: ReplaceBudgetDto,
): Promise<MonthlyBudgetResponse> {
  const { currencyCode } = await resolveBudgetContext(userId, dto.currencyCode);

  const duplicates = new Set<string>();
  const allCategoryIds = [...dto.income.map((item) => item.categoryId), ...dto.expense.map((item) => item.categoryId)];
  for (const categoryId of allCategoryIds) {
    if (duplicates.has(categoryId)) {
      throw new ValidationError(`Category ${categoryId} appears more than once in this budget payload`);
    }

    duplicates.add(categoryId);
  }

  const categories = await budgetsRepository.findOwnedCategoriesByIds(userId, allCategoryIds);
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  for (const item of dto.income) {
    const category = categoriesById.get(item.categoryId);
    if (!category) throw new NotFoundError('Category');
    if (category.type !== 'income') {
      throw new ValidationError(`Category ${item.categoryId} must be of type income`);
    }
  }

  for (const item of dto.expense) {
    const category = categoriesById.get(item.categoryId);
    if (!category) throw new NotFoundError('Category');
    if (category.type !== 'expense') {
      throw new ValidationError(`Category ${item.categoryId} must be of type expense`);
    }
  }

  await db.transaction(async (tx) => {
    await budgetsRepository.replaceMonthBudgets(tx, userId, month, currencyCode, [
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

  return getMonthlyBudget(userId, month, currencyCode);
}
