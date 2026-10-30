import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "@/app";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";

describe("investments: end to end", () => {
  it("tracks cash, a buy, a split, a dividend and a sale with exact numbers", async () => {
    const auth = await createAuthenticatedContext();
    const headers = createAuthHeaders(auth.token, auth.household.id);
    const api = (method: "get" | "post" | "patch" | "put" | "delete", path: string) =>
      request(app)[method](`/api/v1/investments${path}`).set(headers);

    const account = await api("post", "/accounts").send({
      name: "Main brokerage",
      broker: "Example Broker",
      currencyCode: "BRL",
    });
    expect(account.status).toBe(201);
    const accountId = account.body.data.id as string;
    expect(account.body.data).toMatchObject({
      costBasisMethod: "AVERAGE",
      taxProfile: "BR_INDIVIDUAL",
    });

    const asset = await api("post", "/assets").send({
      symbol: "TSTX3",
      name: "Test Corp",
      assetClass: "STOCK",
      exchange: "BVMF",
      country: "BR",
      currencyCode: "BRL",
    });
    expect(asset.status).toBe(201);
    const assetId = asset.body.data.id as string;

    const deposit = await api("post", `/accounts/${accountId}/cash`).send({
      kind: "deposit",
      date: "2026-01-02",
      amount: "10000",
      currencyCode: "BRL",
    });
    expect(deposit.status).toBe(201);
    expect(deposit.body.data.cash).toEqual([{ currencyCode: "BRL", amount: 1_000_000 }]);

    const buy = await api("post", "/events").send({
      accountId,
      assetId,
      type: "BUY",
      tradeDate: "2026-01-05",
      quantity: "100",
      unitPrice: "10",
      fees: "5",
    });
    expect(buy.status).toBe(201);
    expect(buy.body.data).toMatchObject({ grossAmount: "1000", netAmount: "1005" });

    // Selling more than held is refused.
    const oversell = await api("post", "/events").send({
      accountId,
      assetId,
      type: "SELL",
      tradeDate: "2026-01-06",
      quantity: "500",
      unitPrice: "11",
    });
    expect(oversell.status).toBe(422);

    const split = await api("post", "/events").send({
      accountId,
      assetId,
      type: "SPLIT",
      tradeDate: "2026-02-01",
      meta: { ratioFrom: "1", ratioTo: "2" },
    });
    expect(split.status).toBe(201);

    const dividend = await api("post", "/events").send({
      accountId,
      assetId,
      type: "DIVIDEND",
      tradeDate: "2026-02-10",
      grossAmount: "20",
    });
    expect(dividend.status).toBe(201);

    const sell = await api("post", "/events").send({
      accountId,
      assetId,
      type: "SELL",
      tradeDate: "2026-03-10",
      quantity: "50",
      unitPrice: "7",
    });
    expect(sell.status).toBe(201);

    await api("post", `/assets/${assetId}/price`).send({ date: "2026-03-11", price: "8" });

    const positions = await api("get", "/positions?currencyCode=BRL");
    expect(positions.status).toBe(200);
    const [position] = positions.body.data;
    expect(position).toMatchObject({ symbol: "TSTX3", quantity: "150" });
    // Cost 1005 over 200 shares after the split = 5.025 each; 150 shares left cost 753.75.
    expect(position.averageCost).toBe("5.025");
    expect(position.invested).toBe(75_375);
    expect(position.marketValue).toBe(120_000);
    // Sold 50 for 350 against a cost of 251.25.
    expect(position.realizedPnl).toBe(9_875);
    expect(position.income).toBe(2_000);

    const cash = await api("get", `/accounts/${accountId}/cash`);
    // 10000 - 1005 + 20 + 350
    expect(cash.body.data.cash).toEqual([{ currencyCode: "BRL", amount: 936_500 }]);

    const dashboard = await api("get", "/dashboard?period=MAX");
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.marketValue).toBe(120_000);
    // Deposits of 10000 grew to 10565: the annualized return must be positive, not double-counted.
    expect(Number(dashboard.body.data.xirr)).toBeGreaterThan(0);

    // The generic accounts list shows the portfolio's market value (positions + cash).
    const accountsList = await request(app).get("/api/v1/accounts").set(headers);
    const listed = (accountsList.body.data as { id: string; balance: number }[]).find(
      (a) => a.id === accountId,
    );
    expect(listed?.balance).toBe(936_500 + 120_000);

    const taxes = await api("get", "/taxes?year=2026");
    expect(taxes.status).toBe(200);
    // Sales of R$350 are far below the R$20k monthly exemption: no tax due.
    expect(taxes.body.data.apuracao[0]).toMatchObject({ month: "2026-03", taxDue: 0 });

    // Removing the buy would leave the sale uncovered.
    const blocked = await api("delete", `/events/${buy.body.data.id}`);
    expect(blocked.status).toBe(422);

    const list = await api("get", "/events?perPage=2");
    expect(list.body.meta.pagination.totalCount).toBe(5);
  });
});
