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

// ─── Exact decimal rates (goal contributions in another currency) ────────

/** Decimal places kept when a rate is stored or shown (`numeric(28, 14)` in the database). */
export const FX_RATE_SCALE = 14;

const DECIMAL_RATE = /^(\d+)(?:\.(\d+))?$/u;

function roundHalfUpDivision(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  return (numerator % denominator) * 2n >= denominator ? quotient + 1n : quotient;
}

/**
 * Normalizes a positive rate (a decimal string or a number) to a plain decimal string with at most
 * `FX_RATE_SCALE` places and no exponent, trailing zeros trimmed. Never goes through a rounded
 * intermediate: `0.18077` stays `0.18077`, `1e-7` becomes `0.0000001`.
 */
export function normalizeFxRate(rate: string | number): string {
  const text = typeof rate === "number" ? numberToPlainDecimal(rate) : rate.trim();
  const match = DECIMAL_RATE.exec(text);
  if (!match) throw new Error(`Invalid exchange rate: ${String(rate)}`);
  const whole = match[1] as string;
  const fraction = match[2] ?? "";
  let scaled = BigInt(whole + fraction.padEnd(FX_RATE_SCALE, "0").slice(0, FX_RATE_SCALE));
  if ((fraction.charCodeAt(FX_RATE_SCALE) || 48) >= 53) scaled += 1n;
  if (scaled <= 0n) throw new Error(`Invalid exchange rate: ${String(rate)}`);
  const digits = scaled.toString().padStart(FX_RATE_SCALE + 1, "0");
  const decimals = digits.slice(-FX_RATE_SCALE).replace(/0+$/u, "");
  const integer = digits.slice(0, -FX_RATE_SCALE);
  return decimals ? `${integer}.${decimals}` : integer;
}

function numberToPlainDecimal(value: number): string {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid exchange rate: ${value}`);
  const text = String(value);
  if (!/e/iu.test(text)) return text;
  return value.toFixed(FX_RATE_SCALE);
}

/** An exact fraction (`numerator / denominator`, both positive) as a decimal string, half up. */
export function fractionToFxRate(numerator: number | bigint, denominator: number | bigint): string {
  const n = BigInt(numerator);
  const d = BigInt(denominator);
  if (n <= 0n || d <= 0n) throw new Error("An exchange rate must be positive");
  const scaled = roundHalfUpDivision(n * 10n ** BigInt(FX_RATE_SCALE), d);
  return normalizeFxRate(
    `${scaled / 10n ** BigInt(FX_RATE_SCALE)}.${(scaled % 10n ** BigInt(FX_RATE_SCALE)).toString().padStart(FX_RATE_SCALE, "0")}`,
  );
}

/**
 * Converts minor units of one currency into minor units of another with an exact decimal rate
 * (`target units per 1 source unit`). The rate is never rounded; only the result is, once, half up
 * (away from zero for negatives) to the target currency's minor unit.
 */
export function convertMinorUnitsWithRate(
  amountMinor: number,
  rate: string | number,
  sourcePrecision: number,
  targetPrecision: number,
): number {
  const normalized = normalizeFxRate(rate);
  const [whole = "0", fraction = ""] = normalized.split(".");
  const rateScaled = BigInt(whole + fraction);
  const rateDenominator = 10n ** BigInt(fraction.length);
  const negative = amountMinor < 0;
  const absolute = BigInt(Math.abs(amountMinor));
  const numerator = absolute * rateScaled * 10n ** BigInt(targetPrecision);
  const denominator = rateDenominator * 10n ** BigInt(sourcePrecision);
  const rounded = Number(roundHalfUpDivision(numerator, denominator));
  return negative ? -rounded : rounded;
}
