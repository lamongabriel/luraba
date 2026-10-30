import { notificationsTable } from "@luraba/db/schemas/notifications.schema";
import { eq } from "drizzle-orm";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import app from "@/app";
import { db } from "@/db";
import { marketDataService } from "@/modules/market-data/market-data.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { sendInvestmentReminders } from "../investments.reminders";

const day = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

async function setup() {
  const auth = await createAuthenticatedContext();
  const headers = createAuthHeaders(auth.token, auth.household.id);
  const api = (method: "get" | "post", path: string) =>
    request(app)[method](`/api/v1/investments${path}`).set(headers);
  return { auth, api };
}

describe("investments: automation", () => {
  it("suggests splits and dividends only for shares held on the date", async () => {
    const { api } = await setup();
    const account = await api("post", "/accounts").send({ name: "CA", currencyCode: "BRL" });
    const asset = await api("post", "/assets").send({
      symbol: `CA${Math.floor(Math.random() * 900 + 100)}3`,
      name: "CA Corp",
      assetClass: "STOCK",
      exchange: "BVMF",
      country: "BR",
      currencyCode: "BRL",
    });
    await api("post", "/events").send({
      accountId: account.body.data.id,
      assetId: asset.body.data.id,
      type: "BUY",
      tradeDate: "2026-01-05",
      quantity: "100",
      unitPrice: "10",
    });
    const spy = vi.spyOn(marketDataService, "suggestedCorporateActions").mockResolvedValue({
      splits: [
        { date: "2026-03-01", numerator: "2", denominator: "1" },
        { date: "2025-06-01", numerator: "3", denominator: "1" },
      ],
      dividends: [
        { exDate: "2026-02-01", paymentDate: "2026-02-15", amount: "0.50", currency: "BRL" },
      ],
    });
    const response = await api("get", "/corporate-actions");
    spy.mockRestore();
    expect(response.status).toBe(200);
    const rows = response.body.data as {
      kind: string;
      suggestedGross: string | null;
      alreadyRecorded: boolean;
    }[];
    // The 2025 split predates the purchase, so only one split and the dividend remain.
    expect(rows.map((r) => r.kind).sort()).toEqual(["DIVIDEND", "SPLIT"]);
    expect(rows.find((r) => r.kind === "DIVIDEND")).toMatchObject({
      suggestedGross: "50",
      alreadyRecorded: false,
    });
  });

  it("reminds once about a maturing investment", async () => {
    const { auth, api } = await setup();
    const account = await api("post", "/accounts").send({ name: "Maturity", currencyCode: "BRL" });
    const cdb = await api("post", "/assets").send({
      symbol: `MAT${Math.floor(Math.random() * 900 + 100)}`,
      name: "CDB soon",
      assetClass: "CDB",
      currencyCode: "BRL",
      country: "BR",
      fixedIncome: {
        indexer: "PREFIXADO",
        rateForm: "FIXED_ANNUAL",
        rate: "0.11",
        maturityDate: day(3),
      },
    });
    await api("post", "/events").send({
      accountId: account.body.data.id,
      assetId: cdb.body.data.id,
      type: "FI_APPLICATION",
      tradeDate: day(-100),
      quantity: "1",
      unitPrice: "5000",
    });

    const first = await sendInvestmentReminders();
    const second = await sendInvestmentReminders();
    expect(first).toBeGreaterThanOrEqual(1);
    expect(second).toBeGreaterThanOrEqual(1);
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, auth.user.id));
    expect(rows.filter((r) => r.eventType === "investment.maturity_soon")).toHaveLength(1);
  });
});
