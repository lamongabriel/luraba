import {
  formatISODate,
  fractionToFxRate,
  isAfter,
  isBefore,
  now,
  toStartOfDay,
} from "@luraba/domain";
import { FX_PRIMARY_PROVIDER_ID, FX_PROVIDER_FAILURE_MESSAGES } from "@/config/fx";
import { currenciesRepository } from "@/modules/currencies/currencies.repository";
import { DependencyUnavailableError, NotFoundError, ValidationError } from "@/shared/errors";
import { fxProviderOrder, fxProvidersById } from "./fx.providers";
import { fxRateRepository } from "./fx.repository";
import type {
  FxConversionInput,
  FxGroupedValuationInput,
  FxProvider,
  FxProviderId,
  FxRateQuery,
  FxResolvedRate,
  FxValuationInput,
} from "./fx.types";
import {
  buildFxLookupKey,
  invertFxRate,
  normalizeProviderRate,
  parseFxDate,
  roundHalfUp,
} from "./fx.utils";

function toStartOfUtcDay(date: Date): Date {
  return toStartOfDay(date);
}

function mapStoredRate(rate: {
  provider: string;
  fromCurrencyId: string;
  toCurrencyId: string;
  rateDate: Date | string;
  rateNumerator: number;
  rateDenominator: number;
}): FxResolvedRate {
  return {
    provider: rate.provider as FxProviderId,
    fromCurrencyCode: rate.fromCurrencyId,
    toCurrencyCode: rate.toCurrencyId,
    rateDate: typeof rate.rateDate === "string" ? parseFxDate(rate.rateDate) : rate.rateDate,
    rateNumerator: rate.rateNumerator,
    rateDenominator: rate.rateDenominator,
  };
}

function convertMinorUnitsWithRate(
  amount: number,
  rate: FxResolvedRate,
  sourcePrecision: number,
  targetPrecision: number,
): number {
  const sign = amount < 0 ? -1n : 1n;
  const absoluteAmount = BigInt(Math.abs(amount));
  const numerator = absoluteAmount * BigInt(rate.rateNumerator) * BigInt(10 ** targetPrecision);
  const denominator = BigInt(rate.rateDenominator) * BigInt(10 ** sourcePrecision);

  const rounded = roundHalfUp(numerator, denominator);
  return Number(rounded * sign);
}

type FxRateRepositoryLike = {
  findRateByDate: (
    provider: FxProviderId,
    fromCurrencyCode: string,
    toCurrencyCode: string,
    date: Date,
  ) => Promise<
    | {
        provider: string;
        fromCurrencyId: string;
        toCurrencyId: string;
        rateDate: Date | string;
        rateNumerator: number;
        rateDenominator: number;
      }
    | undefined
  >;
  findRateOnOrBefore: (
    provider: FxProviderId,
    fromCurrencyCode: string,
    toCurrencyCode: string,
    date: Date,
  ) => Promise<
    | {
        provider: string;
        fromCurrencyId: string;
        toCurrencyId: string;
        rateDate: Date | string;
        rateNumerator: number;
        rateDenominator: number;
      }
    | undefined
  >;
  upsertRates: typeof fxRateRepository.upsertRates;
};

type CurrencyRepositoryLike = {
  findByCode: typeof currenciesRepository.findByCode;
  listPrecisions: typeof currenciesRepository.listPrecisions;
};

/** A rate for one market day, as an exact decimal (never rounded), with where it came from. */
export type FxDayRate = {
  /** `toCurrencyCode` per 1 `fromCurrencyCode`, up to 14 decimals. */
  rate: string;
  source: string;
  /** The market day the rate is from; before the requested day when that was not a business day. */
  rateDate: Date;
};

/** How many days before the requested day a rate may be from (weekends and holidays). */
export const FX_MAX_LOOKBACK_DAYS = 7;

type FxProvidersById = Record<FxProviderId, FxProvider>;

export class FxService {
  private readonly rateLookupCache = new Map<string, Promise<FxResolvedRate>>();

  constructor(
    private readonly repository: FxRateRepositoryLike = fxRateRepository,
    private readonly providersById: FxProvidersById = fxProvidersById,
    private readonly providerOrder: readonly FxProviderId[] = fxProviderOrder,
    private readonly currencyRepository: CurrencyRepositoryLike = currenciesRepository,
  ) {}

  async getRate(query: FxRateQuery): Promise<FxResolvedRate> {
    const normalizedQuery = {
      ...query,
      fromCurrencyCode: query.fromCurrencyCode.toUpperCase(),
      toCurrencyCode: query.toCurrencyCode.toUpperCase(),
      date: toStartOfUtcDay(query.date),
      provider: query.provider,
    };

    if (normalizedQuery.fromCurrencyCode === normalizedQuery.toCurrencyCode) {
      return {
        provider: FX_PRIMARY_PROVIDER_ID,
        fromCurrencyCode: normalizedQuery.fromCurrencyCode,
        toCurrencyCode: normalizedQuery.toCurrencyCode,
        rateDate: normalizedQuery.date,
        rateNumerator: 1,
        rateDenominator: 1,
      };
    }

    const lookupKey = buildFxLookupKey({
      fromCurrencyCode: normalizedQuery.fromCurrencyCode,
      toCurrencyCode: normalizedQuery.toCurrencyCode,
      rateDate: normalizedQuery.date,
      provider: normalizedQuery.provider,
    });

    const cached = this.rateLookupCache.get(lookupKey);
    if (cached) {
      return cached;
    }

    const lookupPromise = this.resolveRate(normalizedQuery).finally(() => {
      this.rateLookupCache.delete(lookupKey);
    });

    this.rateLookupCache.set(lookupKey, lookupPromise);
    return lookupPromise;
  }

  /**
   * The rate for a given day for dated records (goal contributions): the provider's rate for that day,
   * else the closest previous business day within `FX_MAX_LOOKBACK_DAYS`. Never today's rate for a past
   * day, and never a household override (those are "now" rates). Throws a validation error asking for an
   * explicit rate when none exists.
   *
   * Providers publish fewer digits for rates below 1 (0.1808) than above (5.5311), so when the pair's rate
   * is below 1 the inverse pair is fetched and inverted exactly: more significant digits, same market.
   */
  async getDayRate(query: FxRateQuery): Promise<FxDayRate> {
    const from = query.fromCurrencyCode.toUpperCase();
    const to = query.toCurrencyCode.toUpperCase();
    const date = toStartOfUtcDay(query.date);
    const missing = () =>
      new ValidationError(
        `No ${from} to ${to} exchange rate is available for ${formatISODate(date)} (or the ${FX_MAX_LOOKBACK_DAYS} days before it); give the rate yourself`,
      );
    if (from === to) return { rate: "1", source: FX_PRIMARY_PROVIDER_ID, rateDate: date };

    let resolved: FxResolvedRate;
    try {
      resolved = await this.getRate({ fromCurrencyCode: from, toCurrencyCode: to, date });
    } catch (error) {
      if (error instanceof DependencyUnavailableError) throw missing();
      throw error;
    }
    const ageDays = Math.round((date.getTime() - resolved.rateDate.getTime()) / 86_400_000);
    if (ageDays > FX_MAX_LOOKBACK_DAYS) throw missing();

    if (resolved.rateNumerator < resolved.rateDenominator) {
      const sharper = await this.findInversePair(resolved);
      if (sharper) resolved = sharper;
    }
    return {
      rate: fractionToFxRate(resolved.rateNumerator, resolved.rateDenominator),
      source: resolved.provider,
      rateDate: resolved.rateDate,
    };
  }

  /** The same market day and provider fetched the other way round, inverted; undefined when unavailable. */
  private async findInversePair(rate: FxResolvedRate): Promise<FxResolvedRate | undefined> {
    const stored = await this.repository.findRateByDate(
      rate.provider,
      rate.toCurrencyCode,
      rate.fromCurrencyCode,
      rate.rateDate,
    );
    if (stored) return invertFxRate(mapStoredRate(stored));
    const fetched = await this.fetchAndStoreRate({
      fromCurrencyCode: rate.toCurrencyCode,
      toCurrencyCode: rate.fromCurrencyCode,
      date: rate.rateDate,
      provider: rate.provider,
    });
    return fetched && formatISODate(fetched.rateDate) === formatISODate(rate.rateDate)
      ? invertFxRate(fetched)
      : undefined;
  }

  async convertAmount(input: FxConversionInput): Promise<number> {
    const [rate, precisions] = await Promise.all([
      this.getRate(input),
      this.currencyRepository.listPrecisions([input.fromCurrencyCode, input.toCurrencyCode]),
    ]);

    const sourcePrecision = precisions[input.fromCurrencyCode];
    const targetPrecision = precisions[input.toCurrencyCode];

    if (sourcePrecision === undefined || targetPrecision === undefined) {
      throw new NotFoundError("Currency");
    }

    return convertMinorUnitsWithRate(input.amount, rate, sourcePrecision, targetPrecision);
  }

  async assertCurrencyExists(currencyCode: string): Promise<void> {
    const currency = await this.currencyRepository.findByCode(currencyCode.toUpperCase());
    if (!currency) {
      throw new NotFoundError("Currency");
    }
  }

  async convertGroupedAmounts<TKey extends string>(
    inputs: FxGroupedValuationInput<TKey>[],
    targetCurrencyCode: string,
  ): Promise<Record<TKey, number>> {
    const converted = await this.convertValuations(inputs, targetCurrencyCode);
    const totals = {} as Record<TKey, number>;

    for (const item of converted) {
      totals[item.groupKey] = (totals[item.groupKey] ?? 0) + item.convertedAmount;
    }

    return totals;
  }

  async sumValuations(inputs: FxValuationInput[], targetCurrencyCode: string): Promise<number> {
    const converted = await this.convertValuations(inputs, targetCurrencyCode);
    return converted.reduce((sum, item) => sum + item.convertedAmount, 0);
  }

  async syncLatestRates(baseCurrencyCode: string, quoteCurrencyCodes: string[]): Promise<void> {
    const normalizedBaseCurrencyCode = baseCurrencyCode.toUpperCase();
    const normalizedQuoteCurrencyCodes = quoteCurrencyCodes.map((currencyCode) =>
      currencyCode.toUpperCase(),
    );

    for (const providerId of this.providerOrder) {
      try {
        const provider = this.providersById[providerId];
        const rates = await provider.getLatestRates(
          normalizedBaseCurrencyCode,
          normalizedQuoteCurrencyCodes,
        );
        await this.repository.upsertRates(rates.map(normalizeProviderRate));
        return;
      } catch {}
    }

    throw new DependencyUnavailableError(FX_PROVIDER_FAILURE_MESSAGES.unavailable);
  }

  async backfillRates(
    baseCurrencyCode: string,
    quoteCurrencyCodes: string[],
    from: Date,
    to: Date,
  ): Promise<void> {
    const normalizedBaseCurrencyCode = baseCurrencyCode.toUpperCase();
    const normalizedQuoteCurrencyCodes = quoteCurrencyCodes.map((currencyCode) =>
      currencyCode.toUpperCase(),
    );

    for (const providerId of this.providerOrder) {
      const provider = this.providersById[providerId];
      if (!provider.getTimeSeries) {
        continue;
      }

      try {
        const rates = await provider.getTimeSeries(
          normalizedBaseCurrencyCode,
          normalizedQuoteCurrencyCodes,
          toStartOfUtcDay(from),
          toStartOfUtcDay(to),
        );
        await this.repository.upsertRates(rates.map(normalizeProviderRate));
        return;
      } catch {}
    }

    throw new DependencyUnavailableError(FX_PROVIDER_FAILURE_MESSAGES.unavailable);
  }

  private async convertValuations<TInput extends FxValuationInput>(
    inputs: TInput[],
    targetCurrencyCode: string,
  ): Promise<Array<TInput & { convertedAmount: number }>> {
    const normalizedTargetCurrencyCode = targetCurrencyCode.toUpperCase();
    const precisionMap = await this.currencyRepository.listPrecisions([
      normalizedTargetCurrencyCode,
      ...inputs.map((input) => input.currencyCode.toUpperCase()),
    ]);

    if (precisionMap[normalizedTargetCurrencyCode] === undefined) {
      throw new NotFoundError("Currency");
    }

    return Promise.all(
      inputs.map(async (input) => {
        const normalizedSourceCurrencyCode = input.currencyCode.toUpperCase();
        const sourcePrecision = precisionMap[normalizedSourceCurrencyCode];
        const targetPrecision = precisionMap[normalizedTargetCurrencyCode];

        if (sourcePrecision === undefined || targetPrecision === undefined) {
          throw new NotFoundError("Currency");
        }

        if (normalizedSourceCurrencyCode === normalizedTargetCurrencyCode) {
          return {
            ...input,
            convertedAmount: input.amount,
          };
        }

        const rate = await this.getRate({
          fromCurrencyCode: normalizedSourceCurrencyCode,
          toCurrencyCode: normalizedTargetCurrencyCode,
          date: input.effectiveDate,
        });

        return {
          ...input,
          convertedAmount: convertMinorUnitsWithRate(
            input.amount,
            rate,
            sourcePrecision,
            targetPrecision,
          ),
        };
      }),
    );
  }

  private async resolveRate(query: FxRateQuery): Promise<FxResolvedRate> {
    const storedRate = await this.findStoredExactRate(query);
    if (storedRate) {
      return storedRate;
    }

    const fetchedRate = await this.fetchAndStoreRate(query);
    if (fetchedRate) {
      return fetchedRate;
    }

    const fallbackRate = await this.findStoredRateOnOrBefore(query);
    if (fallbackRate) {
      return fallbackRate;
    }

    throw new DependencyUnavailableError(FX_PROVIDER_FAILURE_MESSAGES.missingRate);
  }

  private async findStoredExactRate(query: FxRateQuery): Promise<FxResolvedRate | undefined> {
    const providersToCheck = query.provider ? [query.provider] : this.providerOrder;

    for (const providerId of providersToCheck) {
      const directRate = await this.repository.findRateByDate(
        providerId,
        query.fromCurrencyCode,
        query.toCurrencyCode,
        query.date,
      );

      if (directRate) {
        return mapStoredRate(directRate);
      }
    }

    for (const providerId of providersToCheck) {
      const reverseRate = await this.repository.findRateByDate(
        providerId,
        query.toCurrencyCode,
        query.fromCurrencyCode,
        query.date,
      );

      if (reverseRate) {
        return invertFxRate(mapStoredRate(reverseRate));
      }
    }

    return undefined;
  }

  private async findStoredRateOnOrBefore(query: FxRateQuery): Promise<FxResolvedRate | undefined> {
    const providersToCheck = query.provider ? [query.provider] : this.providerOrder;

    for (const providerId of providersToCheck) {
      const directRate = await this.repository.findRateOnOrBefore(
        providerId,
        query.fromCurrencyCode,
        query.toCurrencyCode,
        query.date,
      );

      if (directRate) {
        return mapStoredRate(directRate);
      }
    }

    for (const providerId of providersToCheck) {
      const reverseRate = await this.repository.findRateOnOrBefore(
        providerId,
        query.toCurrencyCode,
        query.fromCurrencyCode,
        query.date,
      );

      if (reverseRate) {
        return invertFxRate(mapStoredRate(reverseRate));
      }
    }

    return undefined;
  }

  private async fetchAndStoreRate(query: FxRateQuery): Promise<FxResolvedRate | undefined> {
    const today = formatISODate(now());
    const requestedDate = formatISODate(query.date);
    const providersToCheck = query.provider ? [query.provider] : this.providerOrder;

    for (const providerId of providersToCheck) {
      const provider = this.providersById[providerId];

      try {
        const rates =
          requestedDate >= today
            ? await provider.getLatestRates(query.fromCurrencyCode, [query.toCurrencyCode])
            : await provider.getHistoricalRates(
                query.fromCurrencyCode,
                [query.toCurrencyCode],
                query.date,
              );

        const normalizedRates = rates.map(normalizeProviderRate);
        await this.repository.upsertRates(normalizedRates);

        const resolvedRate = normalizedRates
          .filter((rate) => !isAfter(rate.rateDate, query.date))
          .sort((left, right) =>
            isAfter(left.rateDate, right.rateDate)
              ? -1
              : isBefore(left.rateDate, right.rateDate)
                ? 1
                : 0,
          )
          .at(0);

        if (resolvedRate) {
          return resolvedRate;
        }
      } catch {}
    }

    return this.findStoredRateOnOrBefore(query);
  }
}

export const fxService = new FxService();
