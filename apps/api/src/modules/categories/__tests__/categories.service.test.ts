import { listCategoriesQuerySchema } from "@luraba/contracts/categories";
import { describe, expect, it } from "vitest";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors";
import { createAuthenticatedContext } from "@/test/auth";
import { buildCategoryInput } from "@/test/factories";
import * as categoriesService from "../categories.service";

describe("categories service", () => {
  it("creates a category with color and icon", async () => {
    const context = await createAuthenticatedContext();

    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: "Food",
        type: "expense",
        color: "#10B981",
        icon: "AppleIcon",
      }),
    );

    expect(category.name).toBe("Food");
    expect(category.type).toBe("expense");
    expect(category.color).toBe("#10B981");
    expect(category.icon).toBe("AppleIcon");
  });

  it("rejects duplicate category names in the same household", async () => {
    const context = await createAuthenticatedContext();
    const input = buildCategoryInput({ name: "Salary", type: "income" });

    await categoriesService.createCategory(context.householdContext, input);

    await expect(categoriesService.createCategory(context.householdContext, input)).rejects.toThrow(
      ConflictError,
    );
  });

  it("allows the same category name in different households", async () => {
    const left = await createAuthenticatedContext();
    const right = await createAuthenticatedContext();
    const input = buildCategoryInput({ name: "Groceries" });

    const leftCategory = await categoriesService.createCategory(left.householdContext, input);
    const rightCategory = await categoriesService.createCategory(right.householdContext, input);

    expect(leftCategory.id).not.toBe(rightCategory.id);
    expect(leftCategory.name).toBe(rightCategory.name);
  });

  it("rejects a missing parent category", async () => {
    const context = await createAuthenticatedContext();

    await expect(
      categoriesService.createCategory(
        context.householdContext,
        buildCategoryInput({
          parentId: "2ef3a4ba-fb3b-42f2-9252-fcf549d14210",
        }),
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects a parent category with a different type", async () => {
    const context = await createAuthenticatedContext();
    const incomeParent = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: "Income Parent",
        type: "income",
      }),
    );

    await expect(
      categoriesService.createCategory(
        context.householdContext,
        buildCategoryInput({
          name: "Expense Child",
          type: "expense",
          parentId: incomeParent.id,
        }),
      ),
    ).rejects.toThrow(ValidationError);
  });

  it("lists only categories from the active household", async () => {
    const context = await createAuthenticatedContext();
    const otherContext = await createAuthenticatedContext();

    await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: "Household Category",
      }),
    );

    await categoriesService.createCategory(
      otherContext.householdContext,
      buildCategoryInput({
        name: "Other Household Category",
      }),
    );

    const categories = await categoriesService.listCategories(
      context.householdContext,
      listCategoriesQuerySchema.parse({}),
    );

    expect(categories.data).toHaveLength(1);
    expect(categories.data[0]?.name).toBe("Household Category");
  });

  it("updates a category and can clear optional display fields and parent", async () => {
    const context = await createAuthenticatedContext();
    const parent = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: "Parent", type: "expense" }),
    );
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: "Child", type: "expense", parentId: parent.id }),
    );

    const updated = await categoriesService.updateCategory(context.householdContext, category.id, {
      name: "Updated Child",
      parentId: null,
      color: null,
      icon: null,
    });

    expect(updated).toEqual(
      expect.objectContaining({
        id: category.id,
        name: "Updated Child",
        parentId: null,
        color: null,
        icon: null,
      }),
    );
  });

  it("deletes a category from the active household", async () => {
    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: "Temporary Category" }),
    );

    await categoriesService.deleteCategory(context.householdContext, category.id);

    await expect(
      categoriesService.deleteCategory(context.householdContext, category.id),
    ).rejects.toThrow(NotFoundError);
  });

  it("detaches children when their parent is deleted", async () => {
    const context = await createAuthenticatedContext();
    const parent = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: "Parent To Delete", type: "expense" }),
    );
    const child = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: "Surviving Child", type: "expense", parentId: parent.id }),
    );

    await categoriesService.deleteCategory(context.householdContext, parent.id);

    const categories = await categoriesService.listCategories(
      context.householdContext,
      listCategoriesQuerySchema.parse({}),
    );

    const survivor = categories.data.find((category) => category.id === child.id);
    expect(survivor).toBeDefined();
    expect(survivor?.parentId).toBeNull();
  });
});

describe("categories DB list filters", () => {
  it("combines search and every structured filter in SQL", async () => {
    const context = await createAuthenticatedContext();
    const parent = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: "Filter Parent", type: "expense" }),
    );
    const target = await categoriesService.createCategory(context.householdContext, {
      ...buildCategoryInput({
        name: "Filter Child Target",
        type: "expense",
        color: "#10B981",
        icon: "AppleIcon",
      }),
      parentId: parent.id,
    });

    const result = await categoriesService.listCategories(
      context.householdContext,
      listCategoriesQuerySchema.parse({
        search: "Target",
        types: "expense,income",
        parentIds: parent.id,
        hasParent: true,
        colors: "#10B981",
        icons: "AppleIcon",
        createdAtFrom: "2020-01-01",
        createdAtTo: "2030-01-01",
        updatedAtFrom: "2020-01-01",
        updatedAtTo: "2030-01-01",
        sort: "name",
        page: 1,
        perPage: 1,
      }),
    );

    expect(result.data).toEqual([expect.objectContaining({ id: target.id })]);
    expect(result.meta.pagination.totalCount).toBe(1);
  });
});
