import { describe, expect, it } from "vitest";
import { connectTestClient } from "../testing/connect.js";

const ids = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = "2026-11-02T00:00:00.000Z";
const page = (data: unknown[]) => ({
  success: true,
  data,
  meta: {
    pagination: { page: 1, perPage: 1000, totalCount: data.length, totalPages: 1 },
    summary: null,
  },
});
const card = {
  id: ids(1),
  ownerAccountId: ids(2),
  ledgerAccountId: ids(3),
  name: "Visa Infinite",
  institutionName: "XP",
  institutionDomain: null,
  institutionLogoUrl: null,
  notes: null,
  ownerAccount: {
    id: ids(2),
    name: "Checking",
    institutionName: null,
    institutionLogoUrl: null,
    type: "cash",
    classification: "asset",
    currencyCode: "BRL",
  },
  classification: "liability",
  type: "credit_card",
  currencyCode: "BRL",
  brand: "Visa",
  productType: "credit",
  last4: "1234",
  color: null,
  closingDay: 25,
  dueDay: 5,
  creditLimitAmount: 1_000_000,
  remainingCreditAmount: 900_000,
  balance: 100_000,
  archivedAt: null,
  createdByUserId: null,
  createdAt: now,
  updatedAt: now,
};
/** The n-th month after October 2026 (n=1 is November), on the given day. */
const month = (n: number, day: number) => {
  const index = 9 + n;
  const year = 2026 + Math.floor(index / 12);
  return `${year}-${String((index % 12) + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};
const installment = (n: number, amount: number) => ({
  installmentId: ids(100 + n),
  installmentNumber: n,
  amount,
  billingCycleId: ids(200 + n),
  closingDate: month(n, 25),
  dueDate: month(n, 5),
});
const purchase = (amounts: number[]) => ({
  purchaseId: ids(50),
  creditCardId: card.id,
  transactionId: ids(51),
  description: "Mercado Livre",
  originalDescription: null,
  notes: null,
  categoryId: null,
  merchantId: null,
  purchaseDate: "2026-11-07",
  postedDate: "2026-11-07",
  amount: amounts.reduce((total, value) => total + value, 0),
  installmentCount: amounts.length,
  tags: [],
  includeInBudget: true,
  budgetExpenseTiming: "payment_month",
  budgetInstallmentMode: "per_installment",
  installments: amounts.map((amount, index) => installment(index + 1, amount)),
  createdAt: now,
});

async function setup(handler: (path: string, method: string, body: any) => unknown) {
  const calls: { method: string; path: string; body: any }[] = [];
  const fetch = async (input: string, init: RequestInit) => {
    const url = new URL(input);
    const path = url.pathname.replace("/api/v1", "");
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path, body });
    if (path === "/credit-cards" && method === "GET") return json(page([card]));
    return json(handler(path, method, body));
  };
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  const connected = await connectTestClient({ baseUrl: "http://api.test", apiKey: "lur_x", fetch });
  return { ...connected, calls };
}

describe("card purchases with exact installment amounts", () => {
  it("sends installmentAmounts in minor units and shows the real installments", async () => {
    const { call, calls, close } = await setup((path, method) => {
      if (method === "POST" && path === `/credit-cards/${card.id}/purchases`)
        return { success: true, data: purchase([3406, 3406, 3406, 3406, 3406]) };
      return page([]);
    });
    const result = await call("create_transaction", {
      kind: "credit_card_purchase",
      description: "Mercado Livre",
      creditCard: "Visa Infinite",
      date: "2026-11-07",
      installmentAmounts: [34.06, 34.06, 34.06, 34.06, 34.06],
      linkBill: false,
    });
    expect(result.data.status).toBe("created");
    const post = calls.find((item) => item.method === "POST");
    expect(post?.body.installmentAmounts).toEqual([3406, 3406, 3406, 3406, 3406]);
    expect(post?.body.amount).toBeUndefined();
    expect(result.data.purchase.installments).toHaveLength(5);
    await close();
  });

  it("previews a single installment amount and a rounding mode in a dry run", async () => {
    const { call, calls, close } = await setup(() => page([]));
    const equal = await call("create_transaction", {
      kind: "credit_card_purchase",
      description: "Mercado Livre",
      creditCard: "Visa Infinite",
      date: "2026-11-07",
      installmentAmount: 34.06,
      installments: 5,
      dryRun: true,
    });
    expect(equal.data.wouldCreate.total.amount).toBe(170.3);
    expect(equal.data.wouldCreate.installments).toHaveLength(5);
    const up = await call("create_transaction", {
      kind: "credit_card_purchase",
      description: "Mercado Livre",
      creditCard: "Visa Infinite",
      date: "2026-11-07",
      amount: 170.28,
      installments: 5,
      roundingMode: "round_up_all",
      dryRun: true,
    });
    expect(up.data.wouldCreate.total.amount).toBe(170.3);
    expect(calls.some((item) => item.method === "POST")).toBe(false);
    await close();
  });

  it("rejects an amount that disagrees with the installments", async () => {
    const { call, close } = await setup(() => page([]));
    const result = await call("create_transaction", {
      kind: "credit_card_purchase",
      description: "Mercado Livre",
      creditCard: "Visa Infinite",
      date: "2026-11-07",
      amount: 170.28,
      installmentAmounts: [34.06, 34.06, 34.06, 34.06, 34.06],
      dryRun: true,
    });
    expect(result.isError).toBe(true);
    expect(result.data.status).toBe("invalid_input");
    await close();
  });

  it("still requires an amount for other kinds", async () => {
    const { call, close } = await setup(() => page([]));
    const result = await call("create_transaction", {
      kind: "expense",
      date: "2026-11-07",
      description: "Lunch",
      account: "Checking",
    });
    expect(result.isError).toBe(true);
    expect(result.data.missing).toBe("amount");
    await close();
  });
});

describe("editing card purchases", () => {
  it("fixes one installment amount through update_installment", async () => {
    const { call, calls, close } = await setup((path, method) => {
      if (method === "GET" && path.endsWith(`/purchases/${ids(50)}`))
        return { success: true, data: purchase([3405, 3405, 3405, 3405, 3408]) };
      if (method === "PATCH" && path.includes("/installments/"))
        return { success: true, data: purchase([3405, 3405, 3405, 3405, 3406]) };
      return page([]);
    });
    const dry = await call("update_installment", {
      purchaseId: ids(50),
      creditCard: "Visa Infinite",
      installmentNumber: 5,
      amount: 34.06,
      dryRun: true,
    });
    expect(dry.data.from.amount).toBe(34.08);
    expect(dry.data.newTotal.amount).toBe(170.26);
    expect(calls.some((item) => item.method === "PATCH")).toBe(false);

    const result = await call("update_installment", {
      purchaseId: ids(50),
      creditCard: "Visa Infinite",
      installmentNumber: 5,
      amount: 34.06,
    });
    expect(result.data.status).toBe("updated");
    const patch = calls.find((item) => item.method === "PATCH");
    expect(patch?.path).toBe(
      `/credit-cards/${card.id}/purchases/${ids(50)}/installments/${ids(105)}`,
    );
    expect(patch?.body).toEqual({ amount: 3406 });
    await close();
  });

  it("replaces every installment through update_card_purchase and previews with dryRun", async () => {
    const { call, calls, close } = await setup((path, method) => {
      if (method === "GET" && path.endsWith(`/purchases/${ids(50)}`))
        return { success: true, data: purchase([3405, 3405, 3405, 3405, 3408]) };
      if (method === "PATCH")
        return { success: true, data: purchase([3406, 3406, 3406, 3406, 3406]) };
      return page([]);
    });
    const dry = await call("update_card_purchase", {
      purchaseId: ids(50),
      creditCard: "Visa Infinite",
      date: "2026-11-07",
      installmentAmounts: [34.06, 34.06, 34.06, 34.06, 34.06],
      dryRun: true,
    });
    expect(dry.data.newTotal.amount).toBe(170.3);
    expect(calls.some((item) => item.method === "PATCH")).toBe(false);
    const result = await call("update_card_purchase", {
      purchaseId: ids(50),
      creditCard: "Visa Infinite",
      date: "2026-11-07",
      installmentAmounts: [34.06, 34.06, 34.06, 34.06, 34.06],
      notes: "5x at the store",
    });
    expect(result.data.status).toBe("updated");
    const patch = calls.find((item) => item.method === "PATCH");
    expect(patch?.body.installmentAmounts).toEqual([3406, 3406, 3406, 3406, 3406]);
    expect(patch?.body.notes).toBe("5x at the store");
    await close();
  });

  it("asks for at least one change", async () => {
    const { call, close } = await setup(() => page([]));
    const result = await call("update_card_purchase", {
      purchaseId: ids(50),
      creditCard: "Visa Infinite",
    });
    expect(result.isError).toBe(true);
    await close();
  });
});
