/**
 * Combining amounts of several currencies into one number in a base currency, for display totals.
 * Each currency is converted with its latest rate and everything is rounded ONCE, at the end, to the
 * base currency's minor units (half away from zero). Pure and shared by the API and the web app so
 * both always agree to the cent.
 */

/** The rate that converts one currency into the base currency, as an exact fraction. */
export type CombineFxRate = {
  /** The source currency (never the base currency). */
  currencyCode: string;
  /** 1 major unit of `currencyCode` = rateNumerator / rateDenominator major units of the base. */
  rateNumerator: number;
  rateDenominator: number;
  /** Minor-unit precision of `currencyCode`. */
  precision: number;
};

export type CombineFxContext = {
  baseCurrencyCode: string;
  basePrecision: number;
  rates: readonly CombineFxRate[];
};

export type CombinedAmount = {
  /** In base minor units; `null` when a currency with a non-zero amount has no rate. */
  total: number | null;
  /** The native amounts, one entry per currency, sorted by code. */
  byCurrency: { currencyCode: string; amount: number }[];
};

function roundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n;
  const abs = negative ? -numerator : numerator;
  let quotient = abs / denominator;
  if ((abs % denominator) * 2n >= denominator) quotient += 1n;
  return negative ? -quotient : quotient;
}

/**
 * Sums `byCurrency` (minor units per currency code) into the base currency. Exact until the final
 * rounding, so `[USD 100.01, BRL 50.01]` never accumulates per-currency rounding error.
 */
export function combineMinorUnits(
  byCurrency: Readonly<Record<string, number>>,
  fx: CombineFxContext,
): CombinedAmount {
  const entries = Object.entries(byCurrency)
    .map(([currencyCode, amount]) => ({ currencyCode: currencyCode.toUpperCase(), amount }))
    .sort((left, right) => left.currencyCode.localeCompare(right.currencyCode));

  const legs: { amount: bigint; numerator: bigint; denominator: bigint }[] = [];
  for (const { currencyCode, amount } of entries) {
    if (amount === 0) continue;
    if (currencyCode === fx.baseCurrencyCode) {
      legs.push({
        amount: BigInt(amount),
        numerator: 1n,
        denominator: 10n ** BigInt(fx.basePrecision),
      });
      continue;
    }
    const rate = fx.rates.find((item) => item.currencyCode === currencyCode);
    if (!rate) return { total: null, byCurrency: entries };
    legs.push({
      amount: BigInt(amount),
      numerator: BigInt(rate.rateNumerator),
      denominator: BigInt(rate.rateDenominator) * 10n ** BigInt(rate.precision),
    });
  }

  // value (base minor units) = sum(amount * num / den) * 10^basePrecision, rounded once.
  const common = legs.reduce((product, leg) => product * leg.denominator, 1n);
  const numerator = legs.reduce(
    (sum, leg) => sum + leg.amount * leg.numerator * (common / leg.denominator),
    0n,
  );
  const total = Number(roundHalfAwayFromZero(numerator * 10n ** BigInt(fx.basePrecision), common));

  return { total, byCurrency: entries };
}

/** Whether `byCurrency` mixes currencies (so the headline is a conversion, not a plain sum). */
export function isMixedCurrencies(
  byCurrency: Readonly<Record<string, number>>,
  baseCurrencyCode: string,
): boolean {
  return Object.entries(byCurrency).some(
    ([code, amount]) => amount !== 0 && code.toUpperCase() !== baseCurrencyCode,
  );
}
