import { addDays as addFxDays, formatISODate as formatFxDate, parseISODate as parseFxDate } from '@/shared/lib/date';
import type { FxProviderRate, FxResolvedRate } from './fx.types';

const FX_RATE_DECIMAL_SCALE = 12;

// formatFxDate and parseFxDate are imported from @/shared/lib/date
// addFxDays is imported from @/shared/lib/date

export { formatFxDate, parseFxDate, addFxDays };

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a;
}

function trimTrailingDecimalZeros(value: string): string {
  return value
    .replace(/(\.\d*?[1-9])0+$/u, '$1')
    .replace(/\.0+$/u, '')
    .replace(/\.$/u, '');
}

function normalizeFxRateDecimal(rate: string | number): string {
  const numericRate = typeof rate === 'number' ? rate : Number(rate);

  if (!Number.isFinite(numericRate) || numericRate <= 0) {
    throw new Error(`Invalid FX rate: ${String(rate)}`);
  }

  if (typeof rate === 'string' && /^[0-9]+(?:\.[0-9]+)?$/u.test(rate.trim())) {
    return trimTrailingDecimalZeros(rate.trim());
  }

  return trimTrailingDecimalZeros(numericRate.toFixed(FX_RATE_DECIMAL_SCALE));
}

export function toFxFraction(rate: string | number): Pick<FxResolvedRate, 'rateNumerator' | 'rateDenominator'> {
  const normalized = normalizeFxRateDecimal(rate);
  const [wholePart, fractionPart = ''] = normalized.split('.');
  const precision = fractionPart.length;
  const denominator = precision === 0 ? 1 : 10 ** precision;
  const numerator = Number(wholePart) * denominator + Number(fractionPart || '0');
  const divisor = greatestCommonDivisor(numerator, denominator);

  return {
    rateNumerator: numerator / divisor,
    rateDenominator: denominator / divisor,
  };
}

export function normalizeProviderRate(rate: FxProviderRate): FxResolvedRate {
  return {
    provider: rate.provider,
    fromCurrencyCode: rate.fromCurrencyCode,
    toCurrencyCode: rate.toCurrencyCode,
    rateDate: rate.rateDate,
    ...toFxFraction(rate.rate),
  };
}

export function buildFxLookupKey(parts: {
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rateDate: Date;
  provider?: string;
}): string {
  return `${parts.provider ?? 'any'}:${parts.fromCurrencyCode}:${parts.toCurrencyCode}:${formatFxDate(parts.rateDate)}`;
}

export function invertFxRate(rate: FxResolvedRate): FxResolvedRate {
  return {
    provider: rate.provider,
    fromCurrencyCode: rate.toCurrencyCode,
    toCurrencyCode: rate.fromCurrencyCode,
    rateDate: rate.rateDate,
    rateNumerator: rate.rateDenominator,
    rateDenominator: rate.rateNumerator,
  };
}

export function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;

  if (remainder * 2n >= denominator) {
    return quotient + 1n;
  }

  return quotient;
}
