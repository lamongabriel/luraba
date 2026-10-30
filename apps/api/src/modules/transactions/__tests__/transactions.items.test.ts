import { describe, expect, it } from "vitest";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as categoriesService from "@/modules/categories/categories.service";
import * as productsService from "@/modules/products/products.service";
import { createAuthenticatedContext } from "@/test/auth";
import { buildAccountInput, buildCategoryInput } from "@/test/factories";
import * as itemsService from "../transaction-items.service";
import * as transactionsService from "../transactions.service";

async function setup() {
  const { householdContext } = await createAuthenticatedContext();
  const account = await accountsService.createAccount(
    householdContext,
    buildAccountInput({ name: "Checking", currencyCode: "BRL" }),
  );
  const category = await categoriesService.createCategory(
    householdContext,
    buildCategoryInput({ name: "Shopping", type: "expense" }),
  );
  const transaction = await transactionsService.createTransaction(householdContext, {
    type: "expense",
    description: "Apple Store",
    amount: 9_000,
    currencyCode: "BRL",
    paymentMethodCode: "pix",
    accountId: account.id,
    categoryId: category.id,
    purchaseDate: new Date("2026-03-24T00:00:00.000Z"),
    postedDate: new Date("2026-03-24T00:00:00.000Z"),
  });
  return { householdContext, transaction };
}

describe("transaction items", () => {
  it("replaces the items and saves the price on a new or existing product", async () => {
    const { householdContext, transaction } = await setup();
    const cable = await productsService.createProduct(householdContext, { name: "Cable" });
    expect(cable.price).toBeNull();

    const items = await itemsService.replaceTransactionItems(householdContext, transaction.id, {
      items: [
        {
          name: "Cable",
          productId: cable.id,
          quantity: 2,
          unitPrice: 1_500,
          saveAsProductPrice: true,
        },
        { name: "Earpiece", quantity: 1, unitPrice: 6_000, saveAsProductPrice: true },
        { name: "Sticker", quantity: 1, unitPrice: 100, saveAsProductPrice: false },
      ],
    });
    expect(items.map((item) => [item.name, item.quantity, item.unitPrice])).toEqual([
      ["Cable", 2, 1_500],
      ["Earpiece", 1, 6_000],
      ["Sticker", 1, 100],
    ]);
    expect(items[0].productId).toBe(cable.id);
    expect(items[1].productId).not.toBeNull();
    expect(items[2].productId).toBeNull();

    const repriced = await productsService.getProduct(householdContext, cable.id);
    expect(repriced.price).toBe(1_500);
    const created = await productsService.getProduct(
      householdContext,
      items[1].productId as string,
    );
    expect(created.price).toBe(6_000);
    expect(created.currencyCode).toBe("BRL");

    const replaced = await itemsService.replaceTransactionItems(householdContext, transaction.id, {
      items: [],
    });
    expect(replaced).toEqual([]);
    expect(await itemsService.listTransactionItems(householdContext, transaction.id)).toEqual([]);
  });

  it("rejects products from another household and keeps items when a product is deleted", async () => {
    const { householdContext, transaction } = await setup();
    const other = await createAuthenticatedContext();
    const foreign = await productsService.createProduct(other.householdContext, {
      name: "Foreign",
    });
    await expect(
      itemsService.replaceTransactionItems(householdContext, transaction.id, {
        items: [
          {
            name: "Foreign",
            productId: foreign.id,
            quantity: 1,
            unitPrice: 100,
            saveAsProductPrice: false,
          },
        ],
      }),
    ).rejects.toThrow();

    const mine = await productsService.createProduct(householdContext, {
      name: "Burger",
      price: 2_500,
    });
    await itemsService.replaceTransactionItems(householdContext, transaction.id, {
      items: [
        {
          name: "Burger",
          productId: mine.id,
          quantity: 1,
          unitPrice: 2_500,
          saveAsProductPrice: false,
        },
      ],
    });
    await productsService.deleteProduct(householdContext, mine.id);
    const [item] = await itemsService.listTransactionItems(householdContext, transaction.id);
    expect(item.name).toBe("Burger");
    expect(item.productId).toBeNull();
  });
});
