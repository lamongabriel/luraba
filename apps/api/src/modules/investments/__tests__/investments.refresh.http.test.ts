import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import app from "@/app";
import { marketDataService } from "@/modules/market-data/market-data.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { refreshHeldQuotes, refreshStaleInBackground } from "../investments.refresh";
import type { AssetRecord } from "../investments.types";

async function seedHolding() {
  const auth = await createAuthenticatedContext();
  const headers = createAuthHeaders(auth.token, auth.household.id);
  const api = (method: "get" | "post", path: string) =>
    request(app)[method](`/api/v1/investments${path}`).set(headers);
  const account = await api("post", "/accounts").send({ name: "Fresh", currencyCode: "BRL" });
  const symbol = `FRSH${Math.floor(Math.random() * 9000 + 1000)}`;
  const asset = await api("post", "/assets").send({
    symbol,
    name: "Fresh Corp",
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
    quantity: "10",
    unitPrice: "10",
  });
  return { api, assetId: asset.body.data.id as string, auth };
}

describe("investments: price freshness", () => {
  it("refreshes held assets on weekdays and skips closed markets", async () => {
    const { assetId } = await seedHolding();
    const spy = vi.spyOn(marketDataService, "refreshQuote").mockResolvedValue(null);
    const saturday = await refreshHeldQuotes({ at: new Date("2026-10-31T15:00:00Z") });
    expect(saturday.refreshed).toBe(0);
    expect(spy).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: assetId }),
      true,
    );

    const weekday = await refreshHeldQuotes({ at: new Date("2026-10-30T15:00:00Z") });
    expect(weekday.refreshed).toBeGreaterThanOrEqual(1);
    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: assetId }),
      true,
    );
    spy.mockRestore();
  });

  it("serves cached values at once and refreshes stale quotes in the background", async () => {
    const { api, assetId } = await seedHolding();
    let release: () => void = () => undefined;
    const spy = vi.spyOn(marketDataService, "refreshQuote").mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve(null);
        }),
    );
    // Make the market look open so the stale rule applies.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-30T15:00:00Z"));
    const first = await api("get", "/dashboard");
    expect(first.status).toBe(200);
    expect(first.body.data.priceFreshness.refreshing).toBe(true);
    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: assetId }),
      true,
    );
    release();
    vi.useRealTimers();
    spy.mockRestore();
  });

  it("does not start a refresh for a fresh quote or a closed market", () => {
    const spy = vi.spyOn(marketDataService, "refreshQuote").mockResolvedValue(null);
    const asset = { id: "a1", assetClass: "STOCK", country: "BR", symbol: "X" } as AssetRecord;
    const now = new Date("2026-10-30T15:00:00Z");
    expect(
      refreshStaleInBackground("h", [asset], () => new Date(now.getTime() - 10_000), now),
    ).toBe(0);
    const closed = new Date("2026-10-31T15:00:00Z");
    expect(
      refreshStaleInBackground(
        "h",
        [{ ...asset, id: "a2" }],
        () => new Date("2026-10-30T20:00:00Z"),
        closed,
      ),
    ).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
