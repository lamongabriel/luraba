import { describe, expect, it } from "vitest";
import {
  type InstrumentRef,
  MarketDataError,
  type MarketDataProvider,
  type ProviderErrorCode,
  type RequestContext,
} from "../market-data.types";

const NUMERIC = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export type ContractSubject = {
  label: string;
  provider: MarketDataProvider;
  ref: InstrumentRef;
  ctx?: RequestContext;
  from: string;
  to: string;
  /** Builds the same provider wired to a failing transport; each must throw the given typed error. */
  failures?: {
    code: ProviderErrorCode;
    make: () => MarketDataProvider;
    capability: "quote" | "history" | "search" | "macro" | "fixedIncomePrices";
  }[];
};

/**
 * The contract every adapter must pass against recorded fixtures (no live calls): metadata is
 * sane, each declared capability returns normalized DTOs, and transport failures surface as typed
 * errors the router can fall back on.
 */
export function describeProviderContract(subject: ContractSubject): void {
  const { provider, ref, ctx, from, to } = subject;
  const meta = provider.metadata;

  describe(`provider contract: ${subject.label}`, () => {
    it("declares complete metadata", () => {
      expect(meta.id).toBeTruthy();
      expect(meta.name).toBeTruthy();
      expect(meta.capabilities.length).toBeGreaterThan(0);
      expect(meta.markets.length).toBeGreaterThan(0);
      expect(["realtime", "delayed", "eod"]).toContain(meta.freshness);
      expect(typeof meta.requiresApiKey).toBe("boolean");
      expect(Number.isFinite(meta.priority)).toBe(true);
      for (const limit of Object.values(meta.rateLimits)) expect(limit).toBeGreaterThan(0);
    });

    it("implements every capability it declares", () => {
      const methods: Record<string, string[]> = {
        quote: ["getQuote"],
        history: ["getHistory"],
        search: ["search"],
        fundamentals: ["getFundamentals"],
        corporateActions: ["getDividends", "getSplits"],
        macro: ["getSeries"],
        fixedIncomePrices: ["getTreasuryPrices"],
      };
      for (const capability of meta.capabilities) {
        for (const method of methods[capability] ?? []) {
          expect(typeof (provider as Record<string, unknown>)[method], `${meta.id}.${method}`).toBe(
            "function",
          );
        }
      }
    });

    if (meta.capabilities.includes("quote")) {
      it("returns a normalized quote", async () => {
        const quote = await provider.getQuote?.(ref, ctx);
        expect(quote?.price).toMatch(NUMERIC);
        expect(quote?.currency).toMatch(/^[A-Z]{3}$/);
        expect(quote?.asOf).toBeInstanceOf(Date);
        expect(quote?.provider).toBe(meta.id);
        expect(typeof quote?.isDelayed).toBe("boolean");
        expect(quote?.symbol).toBe(ref.symbol);
      });
    }

    if (meta.capabilities.includes("history")) {
      it("returns normalized, in-range candles", async () => {
        const candles = (await provider.getHistory?.(ref, from, to, ctx)) ?? [];
        expect(candles.length).toBeGreaterThan(0);
        for (const candle of candles) {
          expect(candle.date).toMatch(ISO);
          expect(candle.date >= from && candle.date <= to).toBe(true);
          expect(candle.close).toMatch(NUMERIC);
        }
      });
    }

    if (meta.capabilities.includes("search")) {
      it("returns asset candidates", async () => {
        const candidates = (await provider.search?.(ref.symbol.slice(0, 4), ctx)) ?? [];
        expect(candidates.length).toBeGreaterThan(0);
        for (const candidate of candidates) {
          expect(candidate.symbol).toBeTruthy();
          expect(candidate.provider).toBe(meta.id);
          expect(candidate.providerSymbol).toBeTruthy();
        }
      });
    }

    if (meta.capabilities.includes("macro")) {
      it("returns macro points", async () => {
        const points = (await provider.getSeries?.("CDI_DAILY", from, to, ctx)) ?? [];
        expect(points.length).toBeGreaterThan(0);
        for (const point of points) {
          expect(point.date).toMatch(ISO);
          expect(point.value).toMatch(NUMERIC);
        }
      });
    }

    if (meta.capabilities.includes("fixedIncomePrices")) {
      it("returns treasury prices", async () => {
        const prices = (await provider.getTreasuryPrices?.(ctx)) ?? [];
        expect(prices.length).toBeGreaterThan(0);
        for (const price of prices) {
          expect(price.date).toMatch(ISO);
          expect(price.maturityDate).toMatch(ISO);
          expect(price.sellPrice === null || NUMERIC.test(price.sellPrice)).toBe(true);
        }
      });
    }

    for (const failure of subject.failures ?? []) {
      it(`maps a failing transport to ${failure.code} (${failure.capability})`, async () => {
        const failing = failure.make();
        const run = async () => {
          switch (failure.capability) {
            case "quote":
              return failing.getQuote?.(ref, ctx);
            case "history":
              return failing.getHistory?.(ref, from, to, ctx);
            case "search":
              return failing.search?.("x", ctx);
            case "macro":
              return failing.getSeries?.("CDI_DAILY", from, to, ctx);
            case "fixedIncomePrices":
              return failing.getTreasuryPrices?.(ctx);
          }
        };
        await expect(run()).rejects.toSatisfy(
          (error: unknown) => error instanceof MarketDataError && error.code === failure.code,
        );
      });
    }
  });
}
