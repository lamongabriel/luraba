import Decimal from "decimal.js";

/**
 * Isolated Decimal constructor so the investments maths never depends on the global
 * `Decimal.set`. 40 significant digits comfortably covers quantities (>= 8 dp), prices (>= 8 dp)
 * and rates (>= 10 dp) through chained multiplications and fractional powers.
 */
export const Dec = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type Dec = InstanceType<typeof Dec>;
export type DecimalInput = Dec | string | number;

export const ZERO = new Dec(0);
export const ONE = new Dec(1);

/** Parses a decimal string/number; empty, null and undefined become zero. */
export function d(value: DecimalInput | null | undefined): Dec {
  if (value === null || value === undefined || value === "") {
    return new Dec(0);
  }
  return new Dec(value);
}

/** Wire format: plain decimal string without exponent, trailing zeros trimmed. */
export function toDecimalString(value: DecimalInput, maxDecimals?: number): string {
  const decimal = d(value);
  const rounded = maxDecimals === undefined ? decimal : decimal.toDecimalPlaces(maxDecimals);
  return rounded.toFixed();
}

/** Converts an exact decimal amount to integer minor units (half-up), the app's money format. */
export function toMinor(value: DecimalInput, precision = 2): number {
  return d(value)
    .mul(new Dec(10).pow(precision))
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
}

/** Converts integer minor units to an exact decimal. */
export function fromMinor(minor: number, precision = 2): Dec {
  return new Dec(minor).div(new Dec(10).pow(precision));
}

export function sum(values: readonly DecimalInput[]): Dec {
  return values.reduce<Dec>((total, value) => total.plus(d(value)), new Dec(0));
}

export function min(a: Dec, b: Dec): Dec {
  return a.lt(b) ? a : b;
}

export function max(a: Dec, b: Dec): Dec {
  return a.gt(b) ? a : b;
}
