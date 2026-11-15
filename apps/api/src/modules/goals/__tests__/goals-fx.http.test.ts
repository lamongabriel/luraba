import { goalContributionsTable } from "@luraba/db/schemas/goals.schema";
import { convertMinorUnitsWithRate, fractionToFxRate } from "@luraba/domain";
import { eq } from "drizzle-orm";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "@/app";
import { db } from "@/db";
import * as accountsService from "@/modules/accounts/accounts.service";
import { fxProvidersById } from "@/modules/fx/fx.providers";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildAccountInput, seedExchangeRate } from "@/test/factories";
import { backfillContributionFxRates } from "../goals.fx-backfill.service";

/** R$5,495.41 in minor units: the amount from the bug report. */
const BRL_AMOUNT = 549_541;
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-15T12:00:00.000Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Providers that publish `USD/BRL` per business day and nothing else (no network in tests). */
function stubProviders(table: Record<string, number>) {
  const dates = Object.keys(table).sort();
  const quote = (base: string, quote: string, requested: Date) => {
    const asked = requested.toISOString().slice(0, 10);
    const used = [...dates].reverse().find((candidate) => candidate <= asked);
    if (!used) return [];
    const usdBrl = table[used] as number;
    const pair = `${base}/${quote}`;
    if (pair === "USD/BRL") return [{ rate: usdBrl }];
    if (pair === "BRL/USD") return [{ rate: Number((1 / usdBrl).toFixed(4)) }];
    return [];
  };
  const fetchRates = async (base: string, quotes: string[], date: Date) =>
    quote(base, quotes[0] as string, date).map((row) => ({
      provider: "frankfurter" as const,
      fromCurrencyCode: base,
      toCurrencyCode: quotes[0] as string,
      rateDate: day(
        [...dates].reverse().find((c) => c <= date.toISOString().slice(0, 10)) as string,
      ),
      rate: row.rate,
    }));
  vi.spyOn(fxProvidersById.frankfurter, "getHistoricalRates").mockImplementation(fetchRates);
  vi.spyOn(fxProvidersById.frankfurter, "getLatestRates").mockImplementation((base, quotes) =>
    fetchRates(base, quotes, day("2026-11-15")),
  );
  vi.spyOn(fxProvidersById["yahoo-finance2"], "getHistoricalRates").mockRejectedValue(
    new Error("offline"),
  );
  vi.spyOn(fxProvidersById["yahoo-finance2"], "getLatestRates").mockRejectedValue(
    new Error("offline"),
  );
}

async function setup() {
  const context = await createAuthenticatedContext({ role: "owner" });
  const headers = createAuthHeaders(context.token, context.household.id);
  const household = context.householdContext;
  const account = (name: string, currencyCode: string) =>
    accountsService.createAccount(
      household,
      buildAccountInput({
        name,
        type: "cash",
        details: { kind: "cash", subtype: "savings" },
        currencyCode,
      }),
    );
  const [brl, usd] = await Promise.all([
    account("Brazil Checking", "BRL"),
    account("Inter", "USD"),
  ]);
  const goalResponse = await request(app).post("/api/v1/goals").set(headers).send({
    name: "Investments Brazil",
    kind: "investment",
    currencyCode: "USD",
    targetAmount: 1_000_000,
    startDate: "2026-11-01",
    monthlyContribution: 100_000,
  });
  expect(goalResponse.status).toBe(201);
  const goalId = goalResponse.body.data.id as string;
  const contribute = (body: Record<string, unknown>) =>
    request(app)
      .post(`/api/v1/goals/${goalId}/contribute`)
      .set(headers)
      .send({
        amount: BRL_AMOUNT,
        currencyCode: "BRL",
        fromAccountId: brl.id,
        toAccountId: usd.id,
        ...body,
      });
  const patch = (contributionId: string, body: Record<string, unknown>) =>
    request(app)
      .patch(`/api/v1/goals/${goalId}/contributions/${contributionId}`)
      .set(headers)
      .send(body);
  const rowOf = async (id: string) =>
    (await db.select().from(goalContributionsTable).where(eq(goalContributionsTable.id, id)))[0];
  return { headers, goalId, contribute, patch, rowOf, accounts: { brl, usd } };
}

describe("goal contributions in another currency", () => {
  it("uses the rate of the contribution's date, at full precision, rounding only the amount", async () => {
    const s = await setup();
    await seedExchangeRate("USD", "BRL", 56_354, 10_000, "2026-11-10");
    await seedExchangeRate("USD", "BRL", 55_000, 10_000, "2026-11-12");

    const response = await s.contribute({ contributedOn: "2026-11-10" });
    expect(response.status).toBe(201);
    const contribution = response.body.data.contributions[0];

    const expectedRate = fractionToFxRate(10_000, 56_354); // BRL -> USD, inverted from the day's quote
    expect(expectedRate.replace(/\D/gu, "").replace(/^0+/u, "").length).toBeGreaterThanOrEqual(8);
    const expectedAmount = convertMinorUnitsWithRate(BRL_AMOUNT, expectedRate, 2, 2);
    // Not the 2-decimal rate of the bug report (0.18 -> $989.17), and the 11-12 rate is not used.
    expect(expectedAmount).not.toBe(98_917);
    expect(contribution).toMatchObject({
      amount: expectedAmount,
      originalAmount: BRL_AMOUNT,
      originalCurrency: "BRL",
      fxRate: Number(expectedRate),
      fxRateSource: "frankfurter",
      fxRateDate: "2026-11-10",
    });
    expect(expectedAmount).toBe(Math.round((BRL_AMOUNT * 10_000) / 56_354));
    expect(response.body.data.saved).toBe(expectedAmount);

    const stored = await s.rowOf(contribution.id);
    expect(stored?.fxRate).toBe(`${expectedRate.padEnd(expectedRate.length, "0")}`.padEnd(16, "0"));
    expect(stored?.fxRate?.split(".")[1]?.length).toBe(14);
  });

  it("falls back to the closest previous business day", async () => {
    const s = await setup();
    stubProviders({ "2026-11-12": 5.6, "2026-11-13": 5.5 });
    // 2026-11-14 is a Saturday: the provider answers with Friday's rate.
    const response = await s.contribute({ contributedOn: "2026-11-14" });
    expect(response.status).toBe(201);
    const contribution = response.body.data.contributions[0];
    expect(contribution.contributedOn).toBe("2026-11-14");
    expect(contribution.fxRateDate).toBe("2026-11-13");
    expect(contribution.amount).toBe(
      convertMinorUnitsWithRate(BRL_AMOUNT, fractionToFxRate(10_000, 55_000), 2, 2),
    );
  });

  it("asks for a rate when none exists, never using another day's or today's", async () => {
    const s = await setup();
    stubProviders({ "2026-11-15": 5.0 }); // only today is known
    await seedExchangeRate("USD", "BRL", 60_000, 10_000, "2026-09-01"); // far too old to stand in
    const response = await s.contribute({ contributedOn: "2026-11-10" });
    expect(response.status).toBe(422);
    expect(response.body.error?.message ?? JSON.stringify(response.body)).toMatch(
      /give the rate yourself/u,
    );
    const goal = await request(app).get(`/api/v1/goals/${s.goalId}`).set(s.headers);
    expect(goal.body.data.contributions).toHaveLength(0);
  });

  it("honors an explicit rate exactly as typed", async () => {
    const s = await setup();
    const response = await s.contribute({ contributedOn: "2026-11-10", fxRate: 0.177439412 });
    expect(response.status).toBe(201);
    const contribution = response.body.data.contributions[0];
    expect(contribution).toMatchObject({ fxRate: 0.177439412, fxRateSource: "manual" });
    expect(contribution.amount).toBe(convertMinorUnitsWithRate(BRL_AMOUNT, "0.177439412", 2, 2));
    expect((await s.rowOf(contribution.id))?.fxRate).toBe("0.17743941200000");
  });

  it("quotes the conversion for the form preview", async () => {
    const s = await setup();
    await seedExchangeRate("USD", "BRL", 56_354, 10_000, "2026-11-10");
    const response = await request(app)
      .get("/api/v1/goals/contribution-quote")
      .query({
        fromCurrencyCode: "BRL",
        toCurrencyCode: "USD",
        date: "2026-11-10",
        amount: BRL_AMOUNT,
      })
      .set(s.headers);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      fxRate: Number(fractionToFxRate(10_000, 56_354)),
      fxRateDate: "2026-11-10",
      requestedDate: "2026-11-10",
      originalAmount: BRL_AMOUNT,
      convertedAmount: Math.round((BRL_AMOUNT * 10_000) / 56_354),
    });
  });
});

describe("updating a contribution made in another currency", () => {
  it("recomputes from the new date's rate and keeps totals and the transfer in step", async () => {
    const s = await setup();
    await seedExchangeRate("USD", "BRL", 56_354, 10_000, "2026-11-10");
    await seedExchangeRate("USD", "BRL", 50_000, 10_000, "2026-11-12");
    const created = await s.contribute({ contributedOn: "2026-11-10" });
    const id = created.body.data.contributions[0].id as string;

    const response = await s.patch(id, { contributedOn: "2026-11-12", recompute: true });
    expect(response.status).toBe(200);
    const expected = convertMinorUnitsWithRate(BRL_AMOUNT, fractionToFxRate(10_000, 50_000), 2, 2);
    const contribution = response.body.data.contributions[0];
    expect(contribution).toMatchObject({
      amount: expected,
      originalAmount: BRL_AMOUNT,
      fxRateDate: "2026-11-12",
      contributedOn: "2026-11-12",
    });
    expect(response.body.data.saved).toBe(expected);
    expect(response.body.data.locations).toEqual([
      { accountId: s.accounts.usd.id, amount: expected },
    ]);

    // The transfer behind it moved to the new day (its BRL side is unchanged, USD side matches).
    expect(contribution.transaction.postedDate.slice(0, 10)).toBe("2026-11-12");
  });

  it("keeps the stored rate unless asked, takes an explicit rate, and edits the original amount", async () => {
    const s = await setup();
    await seedExchangeRate("USD", "BRL", 56_354, 10_000, "2026-11-10");
    const created = await s.contribute({ contributedOn: "2026-11-10" });
    const first = created.body.data.contributions[0];

    const kept = await s.patch(first.id, { amount: 100_000 });
    expect(kept.body.data.contributions[0]).toMatchObject({
      originalAmount: 100_000,
      fxRate: first.fxRate,
      amount: convertMinorUnitsWithRate(100_000, fractionToFxRate(10_000, 56_354), 2, 2),
    });

    const manual = await s.patch(first.id, { fxRate: 0.1771234567 });
    expect(manual.body.data.contributions[0]).toMatchObject({
      fxRate: 0.1771234567,
      fxRateSource: "manual",
      amount: convertMinorUnitsWithRate(100_000, "0.1771234567", 2, 2),
    });
  });

  it("rejects a rate on a contribution in the goal's currency", async () => {
    const s = await setup();
    const created = await request(app)
      .post(`/api/v1/goals/${s.goalId}/contribute`)
      .set(s.headers)
      .send({
        amount: 10_000,
        fromAccountId: s.accounts.usd.id,
        toAccountId:
          s.accounts.usd.id === s.accounts.brl.id ? s.accounts.brl.id : s.accounts.usd.id,
      });
    // Same source and destination is refused; use the manual entry instead.
    expect(created.status).toBe(422);
    const manual = await request(app)
      .post(`/api/v1/goals/${s.goalId}/contributions`)
      .set(s.headers)
      .send({ amount: 10_000, contributedOn: "2026-11-02" });
    const id = manual.body.data.contributions[0].id as string;
    expect((await s.patch(id, { fxRate: 0.2 })).status).toBe(422);
  });
});

describe("FX backfill", () => {
  it("lists changed rows in a dry run, writes on apply and is idempotent", async () => {
    const s = await setup();
    await seedExchangeRate("USD", "BRL", 56_354, 10_000, "2026-11-10");
    const created = await s.contribute({ contributedOn: "2026-11-10", fxRate: 0.18 });
    const id = created.body.data.contributions[0].id as string;
    // A row as it was stored before migration 0058: 2-decimal rate, no source.
    await db
      .update(goalContributionsTable)
      .set({ fxRateSource: null, fxRateDate: null })
      .where(eq(goalContributionsTable.id, id));
    expect(created.body.data.contributions[0].amount).toBe(98_917);

    const expected = convertMinorUnitsWithRate(BRL_AMOUNT, fractionToFxRate(10_000, 56_354), 2, 2);

    const dry = await backfillContributionFxRates({ apply: false });
    expect(dry).toMatchObject({ mode: "dry-run", scanned: 1, changed: 1, amountChanged: 1 });
    expect(dry.rows[0]).toMatchObject({
      contributionId: id,
      oldAmount: 98_917,
      newAmount: expected,
      oldRate: "0.18",
      newRate: fractionToFxRate(10_000, 56_354),
      rateSource: "frankfurter",
      rateDate: "2026-11-10",
      change: "amount",
      applied: false,
    });
    expect((await s.rowOf(id))?.amount).toBe(98_917);

    const applied = await backfillContributionFxRates({ apply: true });
    expect(applied.rows[0]).toMatchObject({ applied: true, newAmount: expected });
    expect(await s.rowOf(id)).toMatchObject({
      amount: expected,
      fxRateSource: "frankfurter",
    });
    const goal = await request(app).get(`/api/v1/goals/${s.goalId}`).set(s.headers);
    expect(goal.body.data.saved).toBe(expected);
    expect(goal.body.data.contributions[0].transaction.id).toBeDefined();

    const again = await backfillContributionFxRates({ apply: true });
    expect(again).toMatchObject({ scanned: 1, changed: 0 });
    expect((await s.rowOf(id))?.amount).toBe(expected);
  });

  it("leaves hand-given rates alone and reports a missing rate without touching the row", async () => {
    const s = await setup();
    const manual = await s.contribute({ contributedOn: "2026-11-10", fxRate: 0.1775 });
    stubProviders({});
    const report = await backfillContributionFxRates({ apply: true });
    expect(report.changed).toBe(0);
    expect(report.rows[0]?.note).toMatch(/given by hand/u);
    expect((await s.rowOf(manual.body.data.contributions[0].id))?.fxRate).toBe("0.17750000000000");

    await db
      .update(goalContributionsTable)
      .set({ fxRateSource: null })
      .where(eq(goalContributionsTable.goalId, s.goalId));
    const missing = await backfillContributionFxRates({ apply: true });
    expect(missing.rows[0]).toMatchObject({ change: "none", applied: false });
    expect(missing.rows[0]?.note).toMatch(/no rate/u);
  });
});
