import { listTransactionsQuerySchema } from "@luraba/contracts/transactions";
import { describe, expect, it } from "vitest";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as categoriesService from "@/modules/categories/categories.service";
import { createAuthenticatedContext } from "@/test/auth";
import {
  buildAccountInput,
  buildCategoryInput,
  buildHouseholdContext,
  createHouseholdMembership,
  createUser,
} from "@/test/factories";
import * as transactionsService from "../transactions.service";

describe("who created a record", () => {
  it("records the creator and filters transactions by it", async () => {
    const owner = await createAuthenticatedContext();
    const chris = await createUser({ name: "Chris" });
    await createHouseholdMembership(owner.household.id, chris.id, "member");
    const chrisContext = buildHouseholdContext({
      householdId: owner.household.id,
      userId: chris.id,
      role: "member",
    });

    const account = await accountsService.createAccount(
      chrisContext,
      buildAccountInput({ name: "Shared checking", currencyCode: "BRL" }),
    );
    expect(account.createdByUserId).toBe(chris.id);

    const category = await categoriesService.createCategory(
      owner.householdContext,
      buildCategoryInput({ name: "Groceries", type: "expense" }),
    );
    expect(category.createdByUserId).toBe(owner.user.id);

    const base = {
      type: "expense" as const,
      amount: 2_000,
      currencyCode: "BRL",
      paymentMethodCode: "pix",
      accountId: account.id,
      categoryId: category.id,
      purchaseDate: new Date("2026-03-24T00:00:00.000Z"),
      postedDate: new Date("2026-03-24T00:00:00.000Z"),
    };
    const byOwner = await transactionsService.createTransaction(owner.householdContext, {
      ...base,
      description: "Bought by owner",
    });
    const byChris = await transactionsService.createTransaction(chrisContext, {
      ...base,
      description: "Bought by Chris",
    });
    expect(byOwner.createdByUserId).toBe(owner.user.id);
    expect(byChris.createdByUserId).toBe(chris.id);

    const onlyChris = await transactionsService.listTransactions(
      owner.householdContext,
      listTransactionsQuerySchema.parse({ createdByUserIds: chris.id }),
    );
    expect(onlyChris.data.map((row) => row.id)).toEqual([byChris.id]);
    expect(onlyChris.data[0].createdByUserId).toBe(chris.id);
  });
});
