import { Dec, d, ONE, parseISODate } from "@luraba/domain";
import { currenciesRepository } from "@/modules/currencies/currencies.repository";
import { fxService } from "@/modules/fx/fx.service";

/**
 * Investments never run their own FX: every conversion goes through the existing FX module.
 * This request-scoped helper turns its rational rates into decimals and caches them.
 */
export class FxConverter {
  private readonly cache = new Map<string, Promise<Dec | null>>();
  private precisions: Record<string, number> | null = null;
  /** Pairs that had no rate; callers surface them as a warning and fall back to 1. */
  readonly missing = new Set<string>();

  async rate(from: string, to: string, date: string): Promise<Dec | null> {
    if (from === to) return ONE;
    const key = `${from}>${to}@${date}`;
    let pending = this.cache.get(key);
    if (!pending) {
      pending = fxService
        .getRate({ fromCurrencyCode: from, toCurrencyCode: to, date: parseISODate(date) })
        .then((rate) => new Dec(rate.rateNumerator).div(rate.rateDenominator))
        .catch(() => null);
      this.cache.set(key, pending);
    }
    return pending;
  }

  /** Rate or 1, recording the gap in `missing`. */
  async rateOrOne(from: string, to: string, date: string): Promise<Dec> {
    const rate = await this.rate(from, to, date);
    if (rate === null) {
      this.missing.add(`${from}/${to}`);
      return ONE;
    }
    return rate;
  }

  async precision(currency: string): Promise<number> {
    return (await this.loadPrecisions([currency]))[currency] ?? 2;
  }

  async loadPrecisions(currencies: string[]): Promise<Record<string, number>> {
    const unknown = currencies.filter(
      (code) => !this.precisions || this.precisions[code] === undefined,
    );
    if (unknown.length > 0) {
      const loaded = await currenciesRepository.listPrecisions([...new Set(unknown)]);
      this.precisions = { ...(this.precisions ?? {}), ...loaded };
    }
    return this.precisions ?? {};
  }

  /** Converts an exact amount in `currency` to integer minor units of that currency. */
  async minor(amount: Dec, currency: string): Promise<number> {
    const precision = await this.precision(currency);
    return amount.mul(new Dec(10).pow(precision)).toDecimalPlaces(0, Dec.ROUND_HALF_UP).toNumber();
  }

  /** Converts minor units (any currency) to a Dec in major units. */
  async major(minor: number, currency: string): Promise<Dec> {
    const precision = await this.precision(currency);
    return d(minor).div(new Dec(10).pow(precision));
  }
}
