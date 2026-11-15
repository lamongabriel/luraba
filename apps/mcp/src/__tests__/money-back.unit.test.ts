import { describe, expect, it } from "vitest";
import { connectTestClient } from "../testing/connect.js";

const ids = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = "2026-11-08T00:00:00.000Z";
const PURCHASE = ids(10);
const SPLIT = ids(11);
const CASHBACK = ids(12);
const NUBANK = ids(2);

const page = (data: unknown[]) => ({
  success: true,
  data,
  meta: {
    pagination: { page: 1, perPage: 1000, totalCount: data.length, totalPages: 1 },
    summary: null,
  },
});

const account = {
  id: NUBANK,
  name: "Nubank",
  institutionName: null,
  institutionDomain: null,
  institutionLogoUrl: null,
  imageUploadId: null,
  notes: null,
  classification: "asset",
  type: "cash",
  currencyCode: "BRL",
  archivedAt: null,
  createdByUserId: null,
  createdAt: now,
  updatedAt: now,
  balance: 100000,
  details: { kind: "cash", subtype: "checking" },
  subtype: "checking",
};

const entry = (transactionId: string, reason: string, amount: number) => ({
  transactionId,
  reason,
  description: reason === "split" ? "Split: Chris" : "Cashback",
  amount,
  currencyCode: "BRL",
  postedDate: "2026-11-07",
  accountId: NUBANK,
  accountName: "Nubank",
  accountClassification: "asset",
  creditCardId: null,
});

function transaction(over: Record<string, unknown>) {
  return {
    id: PURCHASE,
    type: "expense",
    description: "Lanchonight",
    originalDescription: null,
    notes: null,
    amount: 27000,
    currencyCode: "BRL",
    toAmount: null,
    toCurrencyCode: null,
    accountId: ids(3),
    accountName: "XP Visa",
    accountClassification: "liability",
    toAccountId: null,
    toAccountName: null,
    toAccountClassification: null,
    categoryId: null,
    merchantId: null,
    paymentMethodId: null,
    paymentMethodCode: null,
    paymentMethodName: null,
    paymentMethodScope: null,
    paymentMethodTranslationKey: null,
    tags: [],
    refund: null,
    moneyBack: null,
    includeInBudget: true,
    purchaseDate: "2026-10-31",
    postedDate: "2026-10-31",
    createdByUserId: null,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

const purchase = transaction({
  moneyBack: {
    totalAmount: 27000,
    receivedBack: 8200,
    outOfPocket: 18800,
    entries: [entry(SPLIT, "split", 8200)],
  },
});
const feedRow = {
  ...purchase,
  rowId: ids(20),
  rowKind: "credit_card_installment",
  originType: "credit_card_installment",
  creditCardId: null,
  purchaseId: ids(21),
  paymentId: null,
  installmentId: ids(20),
  installmentNumber: 1,
  installmentCount: 1,
};
const cashback = transaction({
  id: CASHBACK,
  type: "refund",
  description: "Cashback",
  amount: 1500,
  accountId: NUBANK,
  accountName: "Nubank",
  accountClassification: "asset",
  refund: {
    reason: "cashback",
    originalTransactionId: null,
    creditCardId: null,
    billingCycleId: null,
  },
});

async function setup() {
  const calls: { method: string; path: string; body: any }[] = [];
  const fetch = async (input: string, init: RequestInit) => {
    const url = new URL(input);
    const path = url.pathname.replace("/api/v1", "");
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path, body });
    const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });
    if (path === "/accounts") return json(page([account]));
    if (path === "/credit-cards") return json(page([]));
    if (path === "/transactions" && method === "POST")
      return json({
        success: true,
        data: transaction({
          id: SPLIT,
          type: "refund",
          description: body.description,
          amount: body.amount,
          accountId: body.accountId,
          accountName: "Nubank",
          refund: {
            reason: body.reason,
            originalTransactionId: body.originalTransactionId ?? null,
            creditCardId: null,
            billingCycleId: null,
          },
        }),
      });
    if (path === "/transactions" && method === "GET")
      return json({
        ...page([feedRow]),
        meta: {
          ...page([feedRow]).meta,
          summary: { totalCount: 1, incomeAmount: 0, expenseAmount: 27000, transferCount: 0 },
        },
      });
    if (path === `/transactions/${PURCHASE}`) return json({ success: true, data: purchase });
    if (path === `/transactions/${PURCHASE}/items`) return json({ success: true, data: [] });
    if (path === `/transactions/${CASHBACK}`) return json({ success: true, data: cashback });
    if (path === `/transactions/${CASHBACK}/link-refund`)
      return json({
        success: true,
        data: {
          ...cashback,
          refund: {
            reason: "cashback",
            originalTransactionId: body.originalTransactionId,
            creditCardId: null,
            billingCycleId: null,
          },
        },
      });
    return json(page([]));
  };
  const connected = await connectTestClient({ baseUrl: "http://api.test", apiKey: "lur_x", fetch });
  return { ...connected, calls };
}

describe("money back linked to a purchase over a mocked API", () => {
  it("create_refund links a split paid into another account", async () => {
    const { call, calls, close } = await setup();
    const result = await call("create_refund", {
      reason: "split",
      amount: 82,
      account: "Nubank",
      description: "Split: Mario",
      date: "2026-11-07",
      originalTransactionId: PURCHASE,
    });
    expect(result.isError, result.text).toBe(false);
    const post = calls.find((item) => item.method === "POST" && item.path === "/transactions");
    expect(post?.body).toMatchObject({
      type: "refund",
      reason: "split",
      amount: 8200,
      accountId: NUBANK,
      originalTransactionId: PURCHASE,
    });
    expect(post?.body.creditCardId).toBeUndefined();
    await close();
  });

  it("get_transaction and search_transactions return receivedBack and outOfPocket", async () => {
    const { call, close } = await setup();
    const got = await call("get_transaction", { id: PURCHASE });
    expect(got.data.transaction.receivedBack.amount).toBe(82);
    expect(got.data.transaction.outOfPocket.amount).toBe(188);
    expect(got.data.transaction.receivedBackRows).toMatchObject([
      { id: SPLIT, reason: "split", account: "Nubank", date: "2026-11-07" },
    ]);
    const searched = await call("search_transactions", { text: "Lanchonight" });
    expect(searched.isError, searched.text).toBe(false);
    expect(searched.data.transactions[0].outOfPocket.amount).toBe(188);
    await close();
  });

  it("link_refund previews, links and unlinks", async () => {
    const { call, calls, close } = await setup();
    const preview = await call("link_refund", {
      refundId: CASHBACK,
      originalTransactionId: PURCHASE,
      dryRun: true,
    });
    expect(preview.data).toMatchObject({ status: "dry_run", fits: true });
    expect(preview.data.outOfPocketAfter.amount).toBe(173);
    expect(calls.some((item) => item.method === "PATCH")).toBe(false);

    const linked = await call("link_refund", {
      refundId: CASHBACK,
      originalTransactionId: PURCHASE,
    });
    expect(linked.data.status).toBe("linked");
    expect(calls.find((item) => item.method === "PATCH")?.body).toEqual({
      originalTransactionId: PURCHASE,
    });
    const unlinked = await call("link_refund", { refundId: CASHBACK, originalTransactionId: null });
    expect(unlinked.data.status).toBe("unlinked");

    const wrong = await call("link_refund", {
      refundId: PURCHASE,
      originalTransactionId: PURCHASE,
    });
    expect(wrong.isError).toBe(true);
    await close();
  });
});
