import { describe, expect, it } from "vitest";
import { connectTestClient } from "../testing/connect.js";

const ids = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = "2026-11-02T00:00:00.000Z";
const card = {
  id: ids(1),
  ownerAccountId: ids(2),
  ledgerAccountId: ids(3),
  name: "Nu Card",
  institutionName: null,
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
  brand: "Mastercard",
  productType: "credit",
  last4: "4242",
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
const cycle = {
  id: ids(9),
  creditCardId: card.id,
  periodStart: "2026-09-26",
  periodEnd: "2026-10-25",
  closingDate: "2026-10-25",
  dueDate: "2026-11-05",
  status: "closed",
  statementAmount: 10_510,
  paidAmount: 0,
  remainingAmount: 10_510,
  reconciledAt: null,
  issuerTotal: null,
  roundingMismatch: null,
  displayStatus: "due",
  isCurrent: false,
  isNext: false,
  hasActivity: true,
};
const line = (over: Record<string, unknown>) => ({
  index: 0,
  date: "2026-08-20",
  description: "Wiper blades",
  amount: 10_511,
  kind: "purchase",
  installment: { number: 1, total: 2 },
  status: "corrected",
  difference: 1,
  installmentId: ids(100),
  purchaseId: ids(50),
  purchaseDescription: "Wiper blades",
  lurabaAmount: 10_510,
  ...over,
});
const result = (dryRun: boolean) => ({
  dryRun,
  issuer: "nubank",
  month: "2026-11",
  billingCycleId: cycle.id,
  closingDate: cycle.closingDate,
  dueDate: cycle.dueDate,
  issuerTotal: 10_511,
  lurabaTotalBefore: 10_510,
  lurabaTotalAfter: 10_511,
  remainingDifference: 0,
  reconciled: true,
  summary: { matched: 0, corrected: 1, review: 0, missing: 0, extra: 0 },
  lines: [line({})],
  extra: [],
  warnings: [],
  importId: dryRun ? null : ids(70),
});

async function setup(handler: (path: string, method: string, body: any) => unknown) {
  const calls: { method: string; path: string; body: any }[] = [];
  const fetch = async (input: string, init: RequestInit) => {
    const url = new URL(input);
    const path = url.pathname.replace("/api/v1", "");
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path, body });
    if (path === "/credit-cards" && method === "GET") {
      return new Response(
        JSON.stringify({
          success: true,
          data: [card],
          meta: {
            pagination: { page: 1, perPage: 1000, totalCount: 1, totalPages: 1 },
            summary: null,
          },
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ success: true, data: handler(path, method, body) }), {
      status: 200,
    });
  };
  const connected = await connectTestClient({ baseUrl: "http://api.test", apiKey: "lur_x", fetch });
  return { ...connected, calls };
}

describe("import_card_statement", () => {
  it("applies a statement and reports what was corrected", async () => {
    const { call, calls, close } = await setup((path) => {
      if (path.endsWith("/statements")) return result(false);
      return [];
    });
    const out = await call("import_card_statement", {
      creditCard: "Nu Card",
      month: "2026-11",
      content: "date,title,amount\n2026-08-20,Wiper blades - Parcela 1/2,105.11",
      fileName: "nubank.csv",
    });
    expect(out.data.status).toBe("imported");
    expect(out.data.reconciled).toBe(true);
    expect(out.data.corrected[0]).toMatchObject({
      description: "Wiper blades",
      installment: "1/2",
      statement: { amount: 105.11 },
      luraba: { amount: 105.1 },
    });
    const post = calls.find((item) => item.method === "POST");
    expect(post?.path).toBe(`/credit-cards/${card.id}/statements`);
    expect(post?.body.month).toBe("2026-11");
    await close();
  });

  it("dryRun uses the preview endpoint and writes nothing", async () => {
    const { call, calls, close } = await setup((path) => {
      if (path.endsWith("/statements/preview")) return result(true);
      return [];
    });
    const out = await call("import_card_statement", {
      creditCard: "Nu Card",
      month: "2026-11",
      content: "date,title,amount\n2026-08-20,Wiper blades - Parcela 1/2,105.11",
      dryRun: true,
    });
    expect(out.data.status).toBe("dry_run");
    expect(calls.some((item) => item.path.endsWith("/statements"))).toBe(false);
    await close();
  });

  it("asks for the file when none is given", async () => {
    const { call, close } = await setup(() => []);
    const out = await call("import_card_statement", { creditCard: "Nu Card", month: "2026-11" });
    expect(out.data.status).toBe("invalid_input");
    await close();
  });
});

describe("reconcile_invoice", () => {
  it("sends the issuer total in minor units and reports a mismatch", async () => {
    const { call, calls, close } = await setup((path) => {
      if (path.endsWith("/cycles/reconcile"))
        return {
          reconciled: false,
          issuerTotal: 10_511,
          statementAmount: 10_510,
          difference: -1,
          cycle,
        };
      return [];
    });
    const out = await call("reconcile_invoice", {
      creditCard: "Nu Card",
      month: "2026-11",
      issuerTotal: 105.11,
    });
    expect(calls.find((item) => item.method === "POST")?.body).toEqual({
      month: "2026-11",
      issuerTotal: 10_511,
    });
    expect(out.data.status).toBe("mismatch");
    expect(out.data.difference.amount).toBe(-0.01);
    await close();
  });
});

describe("installmentPlan shorthand", () => {
  it("turns the text into exact installment amounts in a dry run", async () => {
    const { call, close } = await setup(() => []);
    const out = await call("create_transaction", {
      kind: "credit_card_purchase",
      description: "Decolar",
      creditCard: "Nu Card",
      date: "2026-08-14",
      installments: 2,
      installmentPlan: "1st installment 364.90, rest 364.88",
      dryRun: true,
    });
    expect(out.data.wouldCreate.installments.map((item: any) => item.amount.amount)).toEqual([
      364.9, 364.88,
    ]);
    expect(out.data.wouldCreate.total.amount).toBe(729.78);
    const bad = await call("create_transaction", {
      kind: "credit_card_purchase",
      description: "Decolar",
      creditCard: "Nu Card",
      date: "2026-08-14",
      installmentPlan: "1st 10.00, rest 9.00",
      dryRun: true,
    });
    expect(bad.data.status).toBe("invalid_input");
    await close();
  });
});
