import { describe, expect, it } from "vitest";

import { createEditTransactionFormSchema } from "../create-edit-transaction-form.schema";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const TO_ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";
const CARD_ID = "33333333-3333-4333-8333-333333333333";
const CATEGORY_ID = "44444444-4444-4444-8444-444444444444";

const base = {
  description: "Transaction",
  amount: 100,
  toAmount: "" as const,
  accountId: "",
  fromAccountId: "",
  toAccountId: "",
  creditCardId: "",
  categoryId: "",
  merchantId: "",
  paymentMethodCode: "",
  purchaseDate: "2026-08-01",
  postedDate: "2026-08-01",
  installmentCount: 1,
  includeInBudget: true,
  tagIds: [],
};

describe("createEditTransactionFormSchema", () => {
  it.each([
    {
      kind: "expense",
      accountId: ACCOUNT_ID,
      categoryId: CATEGORY_ID,
      paymentMethodCode: "pix",
    },
    {
      kind: "income",
      accountId: ACCOUNT_ID,
      categoryId: CATEGORY_ID,
      paymentMethodCode: "bank_transfer",
    },
    {
      kind: "transfer",
      fromAccountId: ACCOUNT_ID,
      toAccountId: TO_ACCOUNT_ID,
      toAmount: 550,
    },
    {
      kind: "credit_card_purchase",
      creditCardId: CARD_ID,
      categoryId: CATEGORY_ID,
      installmentCount: 12,
    },
    {
      kind: "credit_card_payment",
      creditCardId: CARD_ID,
      fromAccountId: ACCOUNT_ID,
    },
  ] as const)("accepts the $kind form branch", (branch) => {
    expect(createEditTransactionFormSchema.safeParse({ ...base, ...branch }).success).toBe(true);
  });

  it("rejects a transfer to the same account", () => {
    const result = createEditTransactionFormSchema.safeParse({
      ...base,
      kind: "transfer",
      fromAccountId: ACCOUNT_ID,
      toAccountId: ACCOUNT_ID,
      toAmount: 100,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        path: ["toAccountId"],
        message: "Choose a different destination account.",
      }),
    );
  });

  it("requires a destination amount when FX quoting is unavailable", () => {
    const result = createEditTransactionFormSchema.safeParse({
      ...base,
      kind: "transfer",
      fromAccountId: ACCOUNT_ID,
      toAccountId: TO_ACCOUNT_ID,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        path: ["toAmount"],
        message: "Enter or quote a destination amount.",
      }),
    );
  });
});
