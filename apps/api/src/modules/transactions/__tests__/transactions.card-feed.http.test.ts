import type { AddressInfo } from "node:net";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "@/app";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildAccountInput } from "@/test/factories";
import { connectTestClient } from "../../../../../mcp/src/testing/connect";

type Row = {
  description: string;
  postedDate: string;
  purchaseDate: string;
  installmentNumber: number | null;
  originType: string;
};

/**
 * Card purchases are listed on the day they were made (later installments on the 1st of each month),
 * and an invoice always lists its own purchases, whatever their dates.
 */
describe("card purchases in the transactions feed", () => {
  let baseUrl: string;
  let close: () => void;

  beforeAll(async () => {
    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    close = () => server.close();
  });
  afterAll(() => close?.());

  async function setup() {
    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);
    const key = await request(app)
      .post("/api/v1/api-keys")
      .set(createAuthHeaders(context.token))
      .send({ name: "feed" });
    const mcp = await connectTestClient({ baseUrl, apiKey: key.body.data.secret });
    const owner = await request(app)
      .post("/api/v1/accounts")
      .set(headers)
      .send(buildAccountInput({ name: "Inter", currencyCode: "BRL" }));
    expect(owner.status).toBe(201);
    const card = await mcp.call("create_credit_card", {
      name: "XP Visa Infinite",
      ownerAccount: "Inter",
      brand: "Visa",
      last4: "4242",
      limit: 50000,
      closingDay: 28,
      dueDay: 5,
    });
    expect(card.isError, card.text).toBe(false);
    const list = async (query = "") => {
      const response = await request(app).get(`/api/v1/transactions${query}`).set(headers);
      expect(response.status, JSON.stringify(response.body)).toBe(200);
      return response.body.data as Row[];
    };
    return { context, headers, mcp, card: card.data.creditCard as { id: string }, list };
  }

  const today = () => new Date().toISOString().slice(0, 10);

  it("lists a purchase made through the MCP tool on the day it was made, in every filter", async () => {
    const { mcp, headers, card, list } = await setup();
    const created = await mcp.call("create_transaction", {
      kind: "credit_card_purchase",
      description: "Gas - Posto Ipiranga",
      amount: 248.11,
      creditCard: "XP",
      category: "Transportation > Fuel",
      merchant: "Posto Ipiranga",
      createMissing: true,
      date: today(),
    });
    expect(created.isError, created.text).toBe(false);

    for (const query of [
      "",
      `?creditCardIds=${card.id}`,
      "?originTypes=credit_card_installment",
      "?search=Gas",
      `?dateFrom=${today()}&dateTo=${today()}`,
    ]) {
      const rows = await list(query);
      expect(
        rows.map((row) => row.description),
        query,
      ).toContain("Gas - Posto Ipiranga");
      const row = rows.find((item) => item.description === "Gas - Posto Ipiranga");
      expect(row?.postedDate).toBe(today());
      expect(row?.originType).toBe("credit_card_installment");
    }

    const cycles = await request(app).get(`/api/v1/credit-cards/${card.id}/cycles`).set(headers);
    const cycle = (cycles.body.data as { id: string; statementAmount: number }[]).find(
      (item) => item.statementAmount === 24811,
    );
    expect(cycle).toBeTruthy();
    expect((await list(`?billingCycleIds=${cycle?.id}`)).map((row) => row.description)).toContain(
      "Gas - Posto Ipiranga",
    );
    const detail = await request(app)
      .get(`/api/v1/credit-cards/${card.id}/cycles/${cycle?.id}`)
      .set(headers);
    expect(
      detail.body.data.items.map((item: { description: string }) => item.description),
    ).toContain("Gas - Posto Ipiranga");
    await mcp.close();
  });

  it("lands installment 1 on the purchase date and later ones on the 1st of each month", async () => {
    const { mcp, card, list } = await setup();
    const buy = async (description: string, installments: number, date: string) => {
      const created = await mcp.call("create_transaction", {
        kind: "credit_card_purchase",
        description,
        amount: 600,
        creditCard: "XP",
        installments,
        date,
      });
      expect(created.isError, created.text).toBe(false);
    };
    await buy("One-time", 1, "2025-01-15");
    await buy("Mid-month plan", 6, "2025-01-15");
    await buy("First-of-month plan", 6, "2025-01-01");
    await buy("Month-end plan", 3, "2025-01-31");
    const dates = async (description: string) =>
      (await list(`?creditCardIds=${card.id}&search=${encodeURIComponent(description)}`))
        .filter((row) => row.description === description)
        .map((row) => row.postedDate)
        .sort();

    expect(await dates("One-time")).toEqual(["2025-01-15"]);
    expect(await dates("Mid-month plan")).toEqual([
      "2025-01-15",
      "2025-02-01",
      "2025-03-01",
      "2025-04-01",
      "2025-05-01",
      "2025-06-01",
    ]);
    expect(await dates("First-of-month plan")).toEqual([
      "2025-01-01",
      "2025-02-01",
      "2025-03-01",
      "2025-04-01",
      "2025-05-01",
      "2025-06-01",
    ]);
    expect(await dates("Month-end plan")).toEqual(["2025-01-31", "2025-02-01", "2025-03-01"]);

    // On the 1st of a month the whole month's plan installments are already in range.
    const february = await list("?dateFrom=2025-02-01&dateTo=2025-02-01");
    expect(february.map((row) => row.description).sort()).toEqual([
      "First-of-month plan",
      "Mid-month plan",
      "Month-end plan",
    ]);
    const midMonth = await list("?dateFrom=2025-01-02&dateTo=2025-01-31");
    expect(midMonth.map((row) => row.description).sort()).toEqual([
      "Mid-month plan",
      "Month-end plan",
      "One-time",
    ]);
    expect(
      (await list("?dateFrom=2025-01-15&dateTo=2025-01-15")).map((row) => row.description).sort(),
    ).toEqual(["Mid-month plan", "One-time"]);
    await mcp.close();
  });

  it("keeps later installments out of the main list but inside their invoice", async () => {
    const { mcp, headers, card, list } = await setup();
    const created = await mcp.call("create_transaction", {
      kind: "credit_card_purchase",
      description: "Sofa",
      amount: 600,
      creditCard: "XP",
      installments: 3,
      date: today(),
    });
    expect(created.isError, created.text).toBe(false);
    const mainList = (await list()).filter((row) => row.description === "Sofa");
    expect(mainList.map((row) => row.installmentNumber)).toEqual([1]);

    const cycles = await request(app)
      .get(`/api/v1/credit-cards/${card.id}/cycles?scope=all`)
      .set(headers);
    const ids = (cycles.body.data as { id: string }[]).map((cycle) => cycle.id);
    const invoiced = (await list(`?billingCycleIds=${ids.join(",")}`)).filter(
      (row) => row.description === "Sofa",
    );
    expect(invoiced.map((row) => row.installmentNumber).sort()).toEqual([1, 2, 3]);
    await mcp.close();
  });
});
