import { describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import { buildCategoryInput } from '@/test/factories';
import { createAuthenticatedContext } from '@/test/auth';
import * as categoriesService from '../categories.service';

describe('categories service', () => {
  it('creates a category with color and icon', async () => {
    const context = await createAuthenticatedContext();

    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: 'Food',
        type: 'expense',
        color: '#10B981',
        icon: 'AppleIcon',
      }),
    );

    expect(category.name).toBe('Food');
    expect(category.type).toBe('expense');
    expect(category.color).toBe('#10B981');
    expect(category.icon).toBe('AppleIcon');
  });

  it('rejects duplicate category names in the same household', async () => {
    const context = await createAuthenticatedContext();
    const input = buildCategoryInput({ name: 'Salary', type: 'income' });

    await categoriesService.createCategory(context.householdContext, input);

    await expect(categoriesService.createCategory(context.householdContext, input)).rejects.toThrow(ConflictError);
  });

  it('allows the same category name in different households', async () => {
    const left = await createAuthenticatedContext();
    const right = await createAuthenticatedContext();
    const input = buildCategoryInput({ name: 'Groceries' });

    const leftCategory = await categoriesService.createCategory(left.householdContext, input);
    const rightCategory = await categoriesService.createCategory(right.householdContext, input);

    expect(leftCategory.id).not.toBe(rightCategory.id);
    expect(leftCategory.name).toBe(rightCategory.name);
  });

  it('rejects a missing parent category', async () => {
    const context = await createAuthenticatedContext();

    await expect(
      categoriesService.createCategory(
        context.householdContext,
        buildCategoryInput({
          parentId: '2ef3a4ba-fb3b-42f2-9252-fcf549d14210',
        }),
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it('rejects a parent category with a different type', async () => {
    const context = await createAuthenticatedContext();
    const incomeParent = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: 'Income Parent',
        type: 'income',
      }),
    );

    await expect(
      categoriesService.createCategory(
        context.householdContext,
        buildCategoryInput({
          name: 'Expense Child',
          type: 'expense',
          parentId: incomeParent.id,
        }),
      ),
    ).rejects.toThrow(ValidationError);
  });

  it('lists only categories from the active household', async () => {
    const context = await createAuthenticatedContext();
    const otherContext = await createAuthenticatedContext();

    await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: 'Household Category',
      }),
    );

    await categoriesService.createCategory(
      otherContext.householdContext,
      buildCategoryInput({
        name: 'Other Household Category',
      }),
    );

    const categories = await categoriesService.listCategories(context.householdContext);

    expect(categories).toHaveLength(1);
    expect(categories[0]?.name).toBe('Household Category');
  });
});
