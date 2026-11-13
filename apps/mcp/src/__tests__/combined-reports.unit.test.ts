import { describe, expect, it } from "vitest";
import { connectTestClient } from "../testing/connect.js";

const now = "2026-01-01T00:00:00.000Z";
const ID = "11111111-1111-4111-8111-111111111111";

const fx = (missing: string[] = []) => ({
  baseCurrencyCode: "USD",
  basePrecision: 2,
  asOf: missing.length ? null : "2026-11-12",
  rates: missing.length
    ? []
    : [
        {
          currencyCode: "BRL",
          rateNumerator: 1,
          rateDenominator: 5,
          precision: 2,
          rate: 0.2,
          rateDate: "2026-11-12",
          source: "manual",
        },
      ],
  missingCurrencies: missing,
});

const account = (over: Record<string, unknown>) => ({
  id: ID,
  name: "Account",
  institutionName: null,
  institutionDomain: null,
  institutionLogoUrl: null,
  imageUploadId: null,
  notes: null,
  classification: "asset",
  type: "cash",
  currencyCode: "USD",
  createdByUserId: null,
  createdAt: now,
  updatedAt: now,
  balance: 0,
  details: { kind: "cash", subtype: "checking" },
  subtype: "checking",
  ...over,
});

const limit = (value: number | null) => ({
  limit: value,
  closedInvoice: 0,
  openInvoice: 0,
  futureInvoices: 0,
  used: 0,
  available: value,
});

async function setup(routes: Record<string, unknown>) {
  const fetch = async (input: string) => {
    const url = new URL(input);
    const path = url.pathname.replace("/api/v1", "");
    const data = routes[path];
    if (data === undefined) throw new Error(`unexpected ${path}`);
    const body = Array.isArray(data)
      ? {
          success: true,
          data,
          meta: {
            pagination: { page: 1, perPage: 1000, totalCount: data.length, totalPages: 1 },
            summary: null,
          },
        }
      : { success: true, data };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  return connectTestClient({ baseUrl: "http://api.test", apiKey: "lur_x", fetch });
}

describe("report_balances", () => {
  const accounts = [
    account({ name: "Chase", balance: 100_000, currencyCode: "USD" }),
    account({ name: "Nu", balance: 500_000, currencyCode: "BRL" }),
    account({ name: "Loan", balance: 50_000, currencyCode: "USD", classification: "liability" }),
  ];

  it("returns one combined net worth in the base currency and keeps the per-currency amounts", async () => {
    const { call, close } = await setup({
      "/accounts": accounts,
      "/fx/rates": fx(),
      "/households": [],
    });
    const result = await call("report_balances", {});
    // USD 1,000 - 500 + BRL 5,000 * 0.2 = 1,500
    expect(result.data.combinedNetWorth.total).toMatchObject({ amount: 1500, currency: "USD" });
    expect(result.data.netWorth.map((m: { currency: string }) => m.currency).sort()).toEqual([
      "BRL",
      "USD",
    ]);
    expect(result.data.fx.ratesUsed[0]).toMatchObject({ from: "BRL", rate: 0.2, source: "manual" });
    await close();
  });

  it("does not guess when a rate is missing", async () => {
    const { call, close } = await setup({
      "/accounts": accounts,
      "/fx/rates": fx(["BRL"]),
    });
    const result = await call("report_balances", {});
    expect(result.data.combinedNetWorth.total).toBeNull();
    expect(result.data.combinedNetWorth.byCurrency).toHaveLength(2);
    expect(result.data.fx.missingRates).toEqual(["BRL"]);
    expect(result.data.fx.note).toContain("No exchange rate");
    await close();
  });
});

describe("report_credit_cards", () => {
  const amount = (total: number | null, parts: [string, number][]) => ({
    total,
    byCurrency: parts.map(([currencyCode, value]) => ({ currencyCode, amount: value })),
  });

  it("adds the combined totals and the rate used next to the per-currency totals", async () => {
    const { call, close } = await setup({
      "/credit-cards/overview": {
        month: "2026-11",
        cards: [],
        totals: [
          {
            currencyCode: "BRL",
            invoiceAmount: 100_000,
            invoicePaidAmount: 0,
            invoiceRemainingAmount: 100_000,
            limit: limit(null),
          },
        ],
        combined: {
          fx: fx(),
          invoiceAmount: amount(30_000, [
            ["BRL", 100_000],
            ["USD", 10_000],
          ]),
          invoicePaidAmount: amount(0, []),
          invoiceRemainingAmount: amount(30_000, [
            ["BRL", 100_000],
            ["USD", 10_000],
          ]),
          limitTotal: amount(0, []),
          limitAvailable: amount(0, []),
          limitUsed: amount(0, []),
        },
      },
      "/households": [],
    });
    const result = await call("report_credit_cards", { month: "2026-11" });
    expect(result.data.combined.owedThisMonth.total).toMatchObject({
      amount: 300,
      currency: "USD",
    });
    expect(result.data.combined.owedThisMonth.byCurrency).toHaveLength(2);
    expect(result.data.fx).toMatchObject({ baseCurrency: "USD", asOf: "2026-11-12" });
    expect(result.data.totals).toHaveLength(1);
    await close();
  });
});
