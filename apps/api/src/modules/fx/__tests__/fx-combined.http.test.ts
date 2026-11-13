import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "@/app";
import * as categoriesService from "@/modules/categories/categories.service";
import * as creditCardsService from "@/modules/credit-cards/credit-cards.service";
import { fxService } from "@/modules/fx/fx.service";
import { clearFxCombineCache } from "@/modules/fx/fx-combine.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import {
  buildCategoryInput,
  buildCreditCardInput,
  createCreditCardOwner,
  seedExchangeRate,
} from "@/test/factories";

/** Today is 2026-04-30. The household base currency is BRL (the test factory default). */
beforeEach(() => {
  clearFxCombineCache();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function setup() {
  const context = await createAuthenticatedContext({ role: "owner" });
  const headers = createAuthHeaders(context.token, context.household.id);
  const household = context.householdContext;
  const category = await categoriesService.createCategory(
    household,
    buildCategoryInput({ name: "Shopping", type: "expense" }),
  );
  const cardWithInvoice = async (currencyCode: string, name: string, amount: number) => {
    const owner = await createCreditCardOwner(household, { currencyCode });
    const card = await creditCardsService.createCreditCard(
      household,
      buildCreditCardInput({
        ownerAccountId: owner.id,
        name,
        closingDay: 25,
        dueDay: 5,
        creditLimitAmount: amount * 10,
      }),
    );
    await creditCardsService.createPurchase(household, card.id, {
      description: `${name} purchase`,
      amount,
      categoryId: category.id,
      purchaseDate: new Date("2026-04-20T00:00:00.000Z"),
      postedDate: new Date("2026-04-20T00:00:00.000Z"),
      installmentCount: 1,
    });
    return card;
  };
  const overview = async () => {
    const response = await request(app)
      .get("/api/v1/credit-cards/overview")
      .query({ month: "2026-05" })
      .set(headers);
    expect(response.status).toBe(200);
    return response.body.data;
  };
  return { context, headers, cardWithInvoice, overview };
}

describe("combined totals in the base currency", () => {
  it("converts USD and BRL card totals into BRL with the latest stored rate, rounded once", async () => {
    const { cardWithInvoice, overview } = await setup();
    await seedExchangeRate("USD", "BRL", 5_437, 1_000, "2026-04-30"); // 1 USD = 5.437 BRL
    await cardWithInvoice("BRL", "Nu", 20_000); // R$200.00
    await cardWithInvoice("USD", "Chase", 10_001); // $100.01

    const data = await overview();

    expect(data.totals.map((total: { currencyCode: string }) => total.currencyCode)).toEqual([
      "BRL",
      "USD",
    ]);
    // 20000 + 10001 * 5.437 = 20000 + 54_375.437 -> 74_375 (one rounding, to the cent)
    expect(data.combined.invoiceAmount.total).toBe(74_375);
    expect(data.combined.invoiceAmount.byCurrency).toEqual([
      { currencyCode: "BRL", amount: 20_000 },
      { currencyCode: "USD", amount: 10_001 },
    ]);
    expect(data.combined.fx).toMatchObject({
      baseCurrencyCode: "BRL",
      basePrecision: 2,
      asOf: "2026-04-30",
      missingCurrencies: [],
    });
    expect(data.combined.fx.rates).toEqual([
      expect.objectContaining({
        currencyCode: "USD",
        source: "frankfurter",
        rate: 5.437,
        rateDate: "2026-04-30",
      }),
    ]);
    // Limits: R$2,000.00 + $1,000.10 -> combined limit
    expect(data.combined.limitTotal.total).toBe(200_000 + Math.round(100_010 * 5.437));
    // Per-card and per-currency data keep their native currency.
    expect(data.totals[1]).toMatchObject({ currencyCode: "USD", invoiceAmount: 10_001 });
  });

  it("uses the stored rate on or before today when today has none (weekend)", async () => {
    const { cardWithInvoice, overview } = await setup();
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("offline")); // works offline, too
    await seedExchangeRate("USD", "BRL", 5, 1, "2026-04-28");
    await cardWithInvoice("USD", "Chase", 1_000);
    const data = await overview();
    expect(data.combined.invoiceAmount.total).toBe(5_000);
    expect(data.combined.fx.asOf).toBe("2026-04-28");
  });

  it("prefers the household's manual override, and goes back to the market rate when removed", async () => {
    const { headers, cardWithInvoice, overview } = await setup();
    await seedExchangeRate("USD", "BRL", 5, 1, "2026-04-30");
    await cardWithInvoice("USD", "Chase", 10_000);

    const put = await request(app)
      .put("/api/v1/fx/overrides")
      .set(headers)
      .send({ fromCurrencyCode: "usd", toCurrencyCode: "BRL", rate: 6.25 });
    expect(put.status).toBe(200);
    expect(put.body.data).toMatchObject({
      fromCurrencyCode: "USD",
      toCurrencyCode: "BRL",
      rate: 6.25,
    });

    const overridden = await overview();
    expect(overridden.combined.invoiceAmount.total).toBe(62_500);
    expect(overridden.combined.fx.rates[0]).toMatchObject({ source: "manual", rate: 6.25 });

    const list = await request(app).get("/api/v1/fx/overrides").set(headers);
    expect(list.body.data).toHaveLength(1);

    const removed = await request(app).delete("/api/v1/fx/overrides/USD/BRL").set(headers);
    expect(removed.status).toBe(204);
    const market = await overview();
    expect(market.combined.invoiceAmount.total).toBe(50_000);
    expect(market.combined.fx.rates[0].source).toBe("frankfurter");

    const missing = await request(app).delete("/api/v1/fx/overrides/USD/BRL").set(headers);
    expect(missing.status).toBe(404);
  });

  it("does not guess: a missing rate leaves the total null and lists the currency", async () => {
    const { cardWithInvoice, overview } = await setup();
    vi.spyOn(fxService, "getRate").mockRejectedValue(new Error("providers down"));
    await cardWithInvoice("BRL", "Nu", 20_000);
    await cardWithInvoice("USD", "Chase", 10_000);

    const data = await overview();

    expect(data.combined.invoiceAmount.total).toBeNull();
    expect(data.combined.invoiceAmount.byCurrency).toHaveLength(2);
    expect(data.combined.fx.missingCurrencies).toEqual(["USD"]);
    expect(data.combined.fx.rates).toEqual([]);
    expect(data.totals).toHaveLength(2);
  });

  it("works for a household with only base-currency cards and for one with no cards", async () => {
    const { cardWithInvoice, overview } = await setup();
    const empty = await overview();
    expect(empty.combined.invoiceAmount).toEqual({ total: 0, byCurrency: [] });
    expect(empty.combined.fx.asOf).toBeNull();

    await cardWithInvoice("BRL", "Nu", 20_000);
    const only = await overview();
    expect(only.combined.invoiceAmount.total).toBe(20_000);
    expect(only.combined.fx.rates).toEqual([]);
  });

  it("combines the insights totals too", async () => {
    const { headers, cardWithInvoice } = await setup();
    await seedExchangeRate("USD", "BRL", 5, 1, "2026-04-30");
    await cardWithInvoice("BRL", "Nu", 20_000);
    await cardWithInvoice("USD", "Chase", 10_000);
    const response = await request(app)
      .get("/api/v1/credit-cards/insights")
      .query({ month: "2026-05" })
      .set(headers);
    expect(response.status).toBe(200);
    expect(response.body.data.combined.total.total).toBe(70_000);
    expect(response.body.data.combined.previousTotal.total).toBe(0);
  });

  it("GET /api/v1/fx/rates returns the context for the asked currencies; viewers cannot set overrides", async () => {
    const { context, headers } = await setup();
    await seedExchangeRate("USD", "BRL", 5, 1, "2026-04-30");
    const rates = await request(app)
      .get("/api/v1/fx/rates")
      .query({ currencies: "USD,BRL" })
      .set(headers);
    expect(rates.status).toBe(200);
    expect(rates.body.data.rates).toHaveLength(1);
    expect(rates.body.data.baseCurrencyCode).toBe("BRL");

    const viewer = await createAuthenticatedContext({ role: "viewer" });
    const denied = await request(app)
      .put("/api/v1/fx/overrides")
      .set(createAuthHeaders(viewer.token, viewer.household.id))
      .send({ fromCurrencyCode: "USD", toCurrencyCode: "BRL", rate: 5 });
    expect(denied.status).toBe(403);
    expect(context.household.id).not.toBe(viewer.household.id);
  });

  it("rejects an override between a currency and itself", async () => {
    const { headers } = await setup();
    const response = await request(app)
      .put("/api/v1/fx/overrides")
      .set(headers)
      .send({ fromCurrencyCode: "BRL", toCurrencyCode: "BRL", rate: 1 });
    expect(response.status).toBe(422);
  });
});
