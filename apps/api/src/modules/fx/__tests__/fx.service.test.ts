import { afterEach, describe, expect, it, vi } from "vitest";
import { DependencyUnavailableError, NotFoundError } from "@/shared/errors";
import { FxService } from "../fx.service";
import type { FxProvider, FxProviderId } from "../fx.types";

type StoredRate = {
  provider: FxProviderId;
  fromCurrencyId: string;
  toCurrencyId: string;
  rateDate: Date | string;
  rateNumerator: number;
  rateDenominator: number;
};

function createRepository() {
  return {
    findRateByDate: vi.fn<(...args: unknown[]) => Promise<StoredRate | undefined>>(),
    findRateOnOrBefore: vi.fn<(...args: unknown[]) => Promise<StoredRate | undefined>>(),
    upsertRates: vi.fn<(...args: unknown[]) => Promise<void>>(),
  };
}

function createCurrencyRepository(precisions: Record<string, number> = {}) {
  return {
    findByCode: vi.fn(async (currencyCode: string) =>
      precisions[currencyCode] === undefined
        ? undefined
        : { code: currencyCode, symbol: currencyCode, precision: precisions[currencyCode] },
    ),
    listPrecisions: vi
      .fn<(...args: unknown[]) => Promise<Record<string, number>>>()
      .mockResolvedValue(precisions),
  };
}

function createProvider(id: FxProviderId, overrides: Partial<FxProvider> = {}): FxProvider {
  return {
    id,
    healthCheck: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    getLatestRates: vi.fn<(...args: unknown[]) => Promise<never[]>>().mockResolvedValue([]),
    getHistoricalRates: vi.fn<(...args: unknown[]) => Promise<never[]>>().mockResolvedValue([]),
    getTimeSeries: vi.fn<(...args: unknown[]) => Promise<never[]>>().mockResolvedValue([]),
    ...overrides,
  };
}

describe("FxService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a stored direct rate on or before the requested date", async () => {
    const repository = createRepository();
    repository.findRateByDate
      .mockResolvedValueOnce({
        provider: "frankfurter",
        fromCurrencyId: "USD",
        toCurrencyId: "BRL",
        rateDate: new Date("2026-05-20T00:00:00.000Z"),
        rateNumerator: 5,
        rateDenominator: 1,
      })
      .mockResolvedValue(undefined);

    const service = new FxService(repository, {
      frankfurter: createProvider("frankfurter"),
      "yahoo-finance2": createProvider("yahoo-finance2"),
    });

    const rate = await service.getRate({
      fromCurrencyCode: "USD",
      toCurrencyCode: "BRL",
      date: new Date("2026-05-21T15:00:00.000Z"),
    });

    expect(rate).toEqual({
      provider: "frankfurter",
      fromCurrencyCode: "USD",
      toCurrencyCode: "BRL",
      rateDate: new Date("2026-05-20T00:00:00.000Z"),
      rateNumerator: 5,
      rateDenominator: 1,
    });
  });

  it("inverts a stored reverse rate when the direct pair is missing", async () => {
    const repository = createRepository();
    repository.findRateByDate
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        provider: "frankfurter",
        fromCurrencyId: "BRL",
        toCurrencyId: "USD",
        rateDate: new Date("2026-05-20T00:00:00.000Z"),
        rateNumerator: 1,
        rateDenominator: 5,
      })
      .mockResolvedValueOnce(undefined);

    const service = new FxService(repository, {
      frankfurter: createProvider("frankfurter"),
      "yahoo-finance2": createProvider("yahoo-finance2"),
    });

    const rate = await service.getRate({
      fromCurrencyCode: "USD",
      toCurrencyCode: "BRL",
      date: new Date("2026-05-21T00:00:00.000Z"),
    });

    expect(rate).toEqual({
      provider: "frankfurter",
      fromCurrencyCode: "USD",
      toCurrencyCode: "BRL",
      rateDate: new Date("2026-05-20T00:00:00.000Z"),
      rateNumerator: 5,
      rateDenominator: 1,
    });
  });

  it("falls back to the next provider when the primary provider fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T10:00:00.000Z"));

    const repository = createRepository();
    repository.findRateByDate.mockResolvedValue(undefined);
    repository.findRateOnOrBefore.mockResolvedValue(undefined);

    const frankfurter = createProvider("frankfurter", {
      getLatestRates: vi
        .fn<(...args: unknown[]) => Promise<never>>()
        .mockRejectedValue(new Error("down")),
    });
    const yahoo = createProvider("yahoo-finance2", {
      getLatestRates: vi
        .fn<
          (...args: unknown[]) => Promise<
            Array<{
              provider: "yahoo-finance2";
              fromCurrencyCode: string;
              toCurrencyCode: string;
              rateDate: Date;
              rate: number;
            }>
          >
        >()
        .mockResolvedValue([
          {
            provider: "yahoo-finance2",
            fromCurrencyCode: "USD",
            toCurrencyCode: "BRL",
            rateDate: new Date("2026-05-29T00:00:00.000Z"),
            rate: 5.04,
          },
        ]),
    });

    const service = new FxService(repository, {
      frankfurter,
      "yahoo-finance2": yahoo,
    });

    const rate = await service.getRate({
      fromCurrencyCode: "USD",
      toCurrencyCode: "BRL",
      date: new Date("2026-05-29T00:00:00.000Z"),
    });

    expect(frankfurter.getLatestRates).toHaveBeenCalledTimes(1);
    expect(yahoo.getLatestRates).toHaveBeenCalledTimes(1);
    expect(repository.upsertRates).toHaveBeenCalledWith([
      {
        provider: "yahoo-finance2",
        fromCurrencyCode: "USD",
        toCurrencyCode: "BRL",
        rateDate: new Date("2026-05-29T00:00:00.000Z"),
        rateNumerator: 126,
        rateDenominator: 25,
      },
    ]);
    expect(rate).toMatchObject({
      provider: "yahoo-finance2",
      fromCurrencyCode: "USD",
      toCurrencyCode: "BRL",
    });
  });

  it("deduplicates concurrent lookups for the same pair and date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T10:00:00.000Z"));

    const repository = createRepository();
    repository.findRateByDate.mockResolvedValue(undefined);
    repository.findRateOnOrBefore.mockResolvedValue(undefined);

    let resolveRates:
      | ((
          value: Array<{
            provider: "frankfurter";
            fromCurrencyCode: string;
            toCurrencyCode: string;
            rateDate: Date;
            rate: number;
          }>,
        ) => void)
      | undefined;
    const getLatestRates = vi
      .fn<
        (...args: unknown[]) => Promise<
          Array<{
            provider: "frankfurter";
            fromCurrencyCode: string;
            toCurrencyCode: string;
            rateDate: Date;
            rate: number;
          }>
        >
      >()
      .mockImplementation(
        async () =>
          await new Promise((resolve) => {
            resolveRates = resolve;
          }),
      );

    const service = new FxService(
      repository,
      {
        frankfurter: createProvider("frankfurter", { getLatestRates }),
        "yahoo-finance2": createProvider("yahoo-finance2"),
      },
      ["frankfurter", "yahoo-finance2"],
    );

    const query = {
      fromCurrencyCode: "USD",
      toCurrencyCode: "BRL",
      date: new Date("2026-05-29T00:00:00.000Z"),
    };

    const first = service.getRate(query);
    const second = service.getRate(query);
    await vi.waitFor(() => {
      expect(resolveRates).toBeDefined();
    });
    resolveRates?.([
      {
        provider: "frankfurter",
        fromCurrencyCode: "USD",
        toCurrencyCode: "BRL",
        rateDate: new Date("2026-05-29T00:00:00.000Z"),
        rate: 5.1,
      },
    ]);

    const [left, right] = await Promise.all([first, second]);

    expect(getLatestRates).toHaveBeenCalledTimes(1);
    expect(left).toEqual(right);
  });

  it("converts grouped amounts into the requested target currency", async () => {
    const repository = createRepository();
    const currencyRepository = createCurrencyRepository({
      USD: 2,
      BRL: 2,
    });
    repository.findRateByDate
      .mockResolvedValueOnce({
        provider: "frankfurter",
        fromCurrencyId: "USD",
        toCurrencyId: "BRL",
        rateDate: new Date("2026-05-20T00:00:00.000Z"),
        rateNumerator: 5,
        rateDenominator: 1,
      })
      .mockResolvedValue(undefined);

    const service = new FxService(
      repository,
      {
        frankfurter: createProvider("frankfurter"),
        "yahoo-finance2": createProvider("yahoo-finance2"),
      },
      ["frankfurter", "yahoo-finance2"],
      currencyRepository,
    );

    const totals = await service.convertGroupedAmounts(
      [
        {
          groupKey: "travel",
          amount: 1_000,
          currencyCode: "USD",
          effectiveDate: new Date("2026-05-21T00:00:00.000Z"),
        },
        {
          groupKey: "travel",
          amount: 500,
          currencyCode: "BRL",
          effectiveDate: new Date("2026-05-21T00:00:00.000Z"),
        },
      ],
      "BRL",
    );

    expect(totals).toEqual({
      travel: 5_500,
    });
  });

  it("rejects conversions when the target currency is unknown", async () => {
    const repository = createRepository();
    const currencyRepository = createCurrencyRepository({
      USD: 2,
    });

    const service = new FxService(
      repository,
      {
        frankfurter: createProvider("frankfurter"),
        "yahoo-finance2": createProvider("yahoo-finance2"),
      },
      ["frankfurter", "yahoo-finance2"],
      currencyRepository,
    );

    await expect(
      service.sumValuations(
        [
          {
            amount: 1_000,
            currencyCode: "USD",
            effectiveDate: new Date("2026-05-21T00:00:00.000Z"),
          },
        ],
        "BRL",
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws when no provider or stored rate can satisfy the request", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T10:00:00.000Z"));

    const repository = createRepository();
    repository.findRateByDate.mockResolvedValue(undefined);
    repository.findRateOnOrBefore.mockResolvedValue(undefined);

    const service = new FxService(repository, {
      frankfurter: createProvider("frankfurter", {
        getLatestRates: vi
          .fn<(...args: unknown[]) => Promise<never>>()
          .mockRejectedValue(new Error("down")),
      }),
      "yahoo-finance2": createProvider("yahoo-finance2", {
        getLatestRates: vi
          .fn<(...args: unknown[]) => Promise<never>>()
          .mockRejectedValue(new Error("down")),
      }),
    });

    await expect(
      service.getRate({
        fromCurrencyCode: "USD",
        toCurrencyCode: "BRL",
        date: new Date("2026-05-29T00:00:00.000Z"),
      }),
    ).rejects.toThrow(DependencyUnavailableError);
  });

  it("prefers an exact fetched historical rate over an older stored fallback rate", async () => {
    const repository = createRepository();
    repository.findRateByDate.mockResolvedValue(undefined);
    repository.findRateOnOrBefore.mockResolvedValue({
      provider: "frankfurter",
      fromCurrencyId: "USD",
      toCurrencyId: "BRL",
      rateDate: new Date("2025-12-31T00:00:00.000Z"),
      rateNumerator: 548,
      rateDenominator: 100,
    });

    const frankfurter = createProvider("frankfurter", {
      getHistoricalRates: vi
        .fn<
          (...args: unknown[]) => Promise<
            Array<{
              provider: "frankfurter";
              fromCurrencyCode: string;
              toCurrencyCode: string;
              rateDate: Date;
              rate: number;
            }>
          >
        >()
        .mockResolvedValue([
          {
            provider: "frankfurter",
            fromCurrencyCode: "USD",
            toCurrencyCode: "BRL",
            rateDate: new Date("2026-01-20T00:00:00.000Z"),
            rate: 5.61,
          },
        ]),
    });

    const service = new FxService(repository, {
      frankfurter,
      "yahoo-finance2": createProvider("yahoo-finance2"),
    });

    const rate = await service.getRate({
      fromCurrencyCode: "USD",
      toCurrencyCode: "BRL",
      date: new Date("2026-01-20T00:00:00.000Z"),
    });

    expect(frankfurter.getHistoricalRates).toHaveBeenCalledTimes(1);
    expect(rate).toEqual({
      provider: "frankfurter",
      fromCurrencyCode: "USD",
      toCurrencyCode: "BRL",
      rateDate: new Date("2026-01-20T00:00:00.000Z"),
      rateNumerator: 561,
      rateDenominator: 100,
    });
  });
});
