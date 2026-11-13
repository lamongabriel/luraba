import { describe, expect, it } from "vitest";
import { connectTestClient } from "../testing/connect.js";

const group = (currencyCode: string, left: number, leftForCard: number | null) => ({
  currencyCode,
  thisMonth: {
    spendableBalance: left + 50_000,
    accountsBalance: left + 50_000,
    goalFundsHeld: 0,
    incomeReceived: null,
    incomeProjected: null,
    billsRemaining: 20_000,
    goalsOwed: 30_000,
    invoicesDue: 0,
    leftToSpend: left,
  },
  nextMonth: {
    projectedIncome: leftForCard === null ? null : leftForCard + 40_000,
    bills: 20_000,
    goals: 20_000,
    cardCharged: 0,
    commitments: 40_000,
    leftForCard,
  },
  accounts: [],
  bills: [],
  invoices: [],
  goals: [],
});

async function setup() {
  const calls: string[] = [];
  const fetch = async (input: string) => {
    const url = new URL(input);
    calls.push(url.pathname.replace("/api/v1", ""));
    const data = url.pathname.endsWith("/safe-to-spend")
      ? {
          month: "2026-11",
          nextMonth: "2026-12",
          today: "2026-11-12",
          currencies: [group("BRL", 300_000, null), group("USD", 100_000, 50_000)],
          combined: {
            fx: {
              baseCurrencyCode: "USD",
              basePrecision: 2,
              asOf: "2026-11-12",
              rates: [
                {
                  currencyCode: "BRL",
                  rateNumerator: 1,
                  rateDenominator: 5,
                  precision: 2,
                  rate: 0.2,
                  rateDate: "2026-11-12",
                  source: "frankfurter",
                },
              ],
              missingCurrencies: [],
            },
            leftToSpend: {
              total: 160_000,
              byCurrency: [
                { currencyCode: "BRL", amount: 300_000 },
                { currencyCode: "USD", amount: 100_000 },
              ],
            },
            leftForCard: {
              total: 50_000,
              byCurrency: [{ currencyCode: "USD", amount: 50_000 }],
            },
          },
          budgets: { currencyCode: "USD", overspent: [] },
        }
      : [];
    const body = url.pathname.endsWith("/safe-to-spend")
      ? { success: true, data }
      : {
          success: true,
          data,
          meta: {
            pagination: { page: 1, perPage: 1000, totalCount: 0, totalPages: 1 },
            summary: null,
          },
        };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  return connectTestClient({ baseUrl: "http://api.test", apiKey: "lur_x", fetch });
}

describe("report_safe_to_spend", () => {
  it("reports each currency separately and applies the what-if to the right horizon", async () => {
    const { call, close } = await setup();
    const result = await call("report_safe_to_spend", {
      currency: "USD",
      purchaseAmount: 600,
      via: "card",
    });
    expect(result.data.currencies).toHaveLength(1);
    const usd = result.data.currencies[0];
    expect(usd.currency).toBe("USD");
    expect(usd.thisMonthCash.leftToSpend.amount).toBe(1000);
    // 500.00 left for the card, minus a 600.00 card purchase.
    expect(usd.whatIf.leftForCardAfter.amount).toBe(-100);
    expect(usd.whatIf.compromises).toBe(true);
    await close();
  });

  it("charges a cash purchase against this month and leaves unplanned currencies null", async () => {
    const { call, close } = await setup();
    const result = await call("report_safe_to_spend", {
      purchaseAmount: 50,
      currency: "BRL",
      via: "cash",
    });
    const brl = result.data.currencies[0];
    expect(brl.nextMonthCard.leftForCardSpending).toBeNull();
    expect(brl.whatIf.leftToSpendAfter.amount).toBe(2950);
    expect(brl.whatIf.compromises).toBe(false);
    await close();
  });

  it("adds one combined number in the base currency with the rate used", async () => {
    const { call, close } = await setup();
    const result = await call("report_safe_to_spend", {});
    expect(result.data.combined.leftToSpend.total.amount).toBe(1600);
    expect(result.data.combined.leftToSpend.total.currency).toBe("USD");
    expect(result.data.combined.leftToSpend.byCurrency).toHaveLength(2);
    expect(result.data.combined.leftForCard.total.amount).toBe(500);
    expect(result.data.combined.fx.baseCurrency).toBe("USD");
    expect(result.data.combined.fx.ratesUsed[0]).toMatchObject({
      from: "BRL",
      to: "USD",
      rate: 0.2,
      source: "frankfurter",
    });
    expect(result.text).toContain("combined");
    await close();
  });
});
