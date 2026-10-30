import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "@/app";
import {
  createAccessTokenForUser,
  createAuthenticatedContext,
  createAuthHeaders,
} from "@/test/auth";
import { createHouseholdMembership, createUser } from "@/test/factories";

async function setup() {
  const auth = await createAuthenticatedContext();
  const headers = createAuthHeaders(auth.token, auth.household.id);
  const api = (method: "get" | "post" | "patch" | "put" | "delete", path: string) =>
    request(app)[method](`/api/v1/investments${path}`).set(headers);
  return { auth, headers, api };
}

const uid = () => Math.random().toString(36).slice(2, 7).toUpperCase();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

type Api = Awaited<ReturnType<typeof setup>>["api"];

async function stock(api: Api, extra: Record<string, unknown> = {}) {
  const response = await api("post", "/assets").send({
    symbol: `T${uid()}`,
    name: "Scenario Corp",
    assetClass: "STOCK",
    exchange: "BVMF",
    country: "BR",
    currencyCode: "BRL",
    ...extra,
  });
  expect(response.status).toBe(201);
  return response.body.data as { id: string; symbol: string };
}

describe("investments: scenarios", () => {
  it("values a prefixed CDB on its curve and estimates redemption tax", async () => {
    const { api } = await setup();
    const account = await api("post", "/accounts").send({
      name: "Fixed income",
      currencyCode: "BRL",
    });
    const accountId = account.body.data.id;
    const cdb = await api("post", "/assets").send({
      symbol: `CDB${uid()}`,
      name: "CDB 12% a.a.",
      assetClass: "CDB",
      currencyCode: "BRL",
      country: "BR",
      fixedIncome: {
        indexer: "PREFIXADO",
        rateForm: "FIXED_ANNUAL",
        rate: "0.12",
        dayCount: "BUS_252",
        maturityDate: daysAgo(-400),
        fgcCovered: true,
      },
    });
    expect(cdb.status).toBe(201);
    const apply = await api("post", "/events").send({
      accountId,
      assetId: cdb.body.data.id,
      type: "FI_APPLICATION",
      tradeDate: daysAgo(200),
      quantity: "1",
      unitPrice: "10000",
    });
    expect(apply.status).toBe(201);

    const positions = await api("get", `/positions?accountId=${accountId}`);
    const [position] = positions.body.data;
    expect(position.invested).toBe(1_000_000);
    expect(position.marketValue).toBeGreaterThan(1_000_000);
    expect(position.fixedIncome).toMatchObject({ indexer: "PREFIXADO", fgcCovered: true });
    expect(position.fixedIncome.estimatedIr).toBeGreaterThan(0);
    expect(position.netValue).toBeLessThan(position.marketValue);

    const detail = await api("get", `/assets/${cdb.body.data.id}/detail`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.fixedIncomeCurve.length).toBeGreaterThan(1);
    expect(detail.body.data.fixedIncomeProjection.netValue).toBeGreaterThan(0);
  });

  it("matches sales to the oldest lot when the account uses FIFO", async () => {
    const { api } = await setup();
    const account = await api("post", "/accounts").send({
      name: "FIFO",
      currencyCode: "BRL",
      costBasisMethod: "FIFO",
    });
    const accountId = account.body.data.id;
    const asset = await stock(api);
    for (const [date, price] of [
      ["2026-01-05", "10"],
      ["2026-01-06", "20"],
    ] as const) {
      await api("post", "/events").send({
        accountId,
        assetId: asset.id,
        type: "BUY",
        tradeDate: date,
        quantity: "10",
        unitPrice: price,
      });
    }
    await api("post", "/events").send({
      accountId,
      assetId: asset.id,
      type: "SELL",
      tradeDate: "2026-02-01",
      quantity: "10",
      unitPrice: "30",
    });
    const [position] = (await api("get", `/positions?accountId=${accountId}`)).body.data;
    // Oldest lot (cost 10) sold at 30 => 200 realized; the 10 shares left cost 20 each.
    expect(position).toMatchObject({ quantity: "10", averageCost: "20", realizedPnl: 20_000 });
    const detail = await api("get", `/assets/${asset.id}/detail`);
    expect(detail.body.data.lots).toHaveLength(1);
    expect(detail.body.data.lots[0].unitCost).toBe("20");
  });

  it("withholds 30% on a US dividend for a non-resident and computes lot gains", async () => {
    const { api } = await setup();
    const account = await api("post", "/accounts").send({
      name: "US broker",
      currencyCode: "USD",
      country: "US",
      taxProfile: "US_NONRESIDENT",
    });
    const accountId = account.body.data.id;
    const asset = await stock(api, { exchange: "NASDAQ", country: "US", currencyCode: "USD" });
    await api("post", "/events").send({
      accountId,
      assetId: asset.id,
      type: "BUY",
      tradeDate: "2025-01-02",
      quantity: "10",
      unitPrice: "100",
    });
    const dividend = await api("post", "/events").send({
      accountId,
      assetId: asset.id,
      type: "DIVIDEND",
      tradeDate: "2025-03-01",
      grossAmount: "100",
    });
    expect(dividend.body.data).toMatchObject({ taxesWithheld: "30", netAmount: "70" });
    await api("post", "/events").send({
      accountId,
      assetId: asset.id,
      type: "SELL",
      tradeDate: "2026-03-01",
      quantity: "10",
      unitPrice: "150",
    });
    const taxes = await api("get", `/taxes?year=2026&accountId=${accountId}`);
    expect(taxes.body.data.usGains[0]).toMatchObject({
      term: "LONG",
      gain: 50_000,
      currencyCode: "USD",
    });
  });

  it("reports allocation against targets and splits a contribution", async () => {
    const { api } = await setup();
    const portfolio = await api("post", "/portfolios").send({
      name: "Main",
      reportingCurrencyCode: "BRL",
    });
    const portfolioId = portfolio.body.data.id;
    const account = await api("post", "/accounts").send({
      name: "Alloc",
      currencyCode: "BRL",
      portfolioId,
    });
    const accountId = account.body.data.id;
    const a = await stock(api);
    const b = await stock(api, { assetClass: "FII" });
    for (const [asset, price] of [
      [a, "60"],
      [b, "40"],
    ] as const) {
      await api("post", "/events").send({
        accountId,
        assetId: asset.id,
        type: "BUY",
        tradeDate: "2026-01-05",
        quantity: "10",
        unitPrice: price,
      });
    }
    const saved = await api("put", `/portfolios/${portfolioId}/targets`).send({
      dimension: "class",
      targets: [
        { key: "STOCK", percent: "50" },
        { key: "FII", percent: "50" },
      ],
    });
    expect(saved.body.data.saved).toBe(2);

    const report = await api("get", `/allocation?portfolioId=${portfolioId}&dimension=class`);
    const stockRow = report.body.data.targets.find((t: { key: string }) => t.key === "STOCK");
    expect(stockRow).toMatchObject({ currentPercent: "60", targetPercent: "50", drift: "10" });

    const rebalance = await api(
      "get",
      `/rebalance?portfolioId=${portfolioId}&dimension=class&contribution=1000`,
    );
    const rows = rebalance.body.data.rows as { key: string; buy: number }[];
    // Portfolio 1000 + 1000 contribution => 1000 per class: FII is short 600, stock 400.
    expect(rows.find((r) => r.key === "FII")?.buy).toBe(60_000);
    expect(rows.find((r) => r.key === "STOCK")?.buy).toBe(40_000);
  });

  it("lets a viewer read but not write", async () => {
    const { auth, api } = await setup();
    const viewer = await createUser();
    await createHouseholdMembership(auth.household.id, viewer.id, "viewer");
    const token = await createAccessTokenForUser(viewer);
    const viewerHeaders = createAuthHeaders(token, auth.household.id);
    const read = await request(app).get("/api/v1/investments/positions").set(viewerHeaders);
    expect(read.status).toBe(200);
    const write = await request(app)
      .post("/api/v1/investments/portfolios")
      .set(viewerHeaders)
      .send({ name: "x", reportingCurrencyCode: "BRL" });
    expect(write.status).toBe(403);
    void api;
  });

  it("hides one household's data from another", async () => {
    const one = await setup();
    const two = await setup();
    const account = await one.api("post", "/accounts").send({ name: "Mine", currencyCode: "BRL" });
    const other = await two.api("get", `/accounts/${account.body.data.id}`);
    expect(other.status).toBe(404);
  });
});
