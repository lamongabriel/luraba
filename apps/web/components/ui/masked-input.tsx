"use client";

import type * as React from "react";
import { Input } from "@/components/ui/input";
import {
  getNumberSeparators,
  maskDecimalString,
  toCanonicalString,
  unmaskDecimalString,
  unmaskMoneyString,
} from "@/lib/number-format";

type MaskedValue = string | number | null | undefined;

type MaskedInputBaseProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "defaultValue" | "onChange" | "inputMode" | "step" | "min" | "max"
> & {
  value: MaskedValue;
  /** Receives the canonical decimal string (`"12.34"`, `"-5"`, or `""` when empty). */
  onValueChange: (value: string) => void;
  language?: string;
};

/**
 * Money amount entry. Digits push in from the right (`1`,`2`,`3`,`4` shows `12.34`) and the text is
 * grouped like every other amount in the app. `precision` is the currency's decimal places.
 */
export function MoneyInput({
  value,
  onValueChange,
  precision = 2,
  allowNegative = false,
  language = "en",
  placeholder,
  ...props
}: MaskedInputBaseProps & { precision?: number; allowNegative?: boolean }) {
  const canonical = toCanonicalString(value);
  const shown = canonical === "-" ? "-" : maskFixed(canonical, precision, language);
  return (
    <Input
      {...props}
      type="text"
      inputMode={allowNegative ? "text" : "numeric"}
      autoComplete="off"
      value={shown}
      placeholder={placeholder ?? maskFixed("0", precision, language)}
      onChange={(event) =>
        onValueChange(unmaskMoneyString(event.target.value, { precision, allowNegative }))
      }
    />
  );
}

function maskFixed(canonical: string, precision: number, language: string): string {
  if (canonical === "") return "";
  const [integerPart = "0", fraction = ""] = canonical.split(".");
  const fixed = precision > 0 ? `${integerPart}.${fraction.padEnd(precision, "0")}` : integerPart;
  return maskDecimalString(fixed, language);
}

/**
 * Plain numbers that are not money: counts, days, percentages, areas. `decimals` is 0 for whole
 * numbers. The same grouping and separators as `MoneyInput`, but digits are typed left to right.
 */
export function NumberInput({
  value,
  onValueChange,
  decimals = 0,
  allowNegative = false,
  language = "en",
  ...props
}: MaskedInputBaseProps & { decimals?: number; allowNegative?: boolean }) {
  const canonical = toCanonicalString(value);
  return (
    <Input
      {...props}
      type="text"
      inputMode={decimals > 0 ? "decimal" : "numeric"}
      autoComplete="off"
      value={canonical === "-" ? "-" : maskDecimalString(canonical, language)}
      onChange={(event) =>
        onValueChange(
          unmaskDecimalString(event.target.value, { decimals, allowNegative, language }),
        )
      }
    />
  );
}

/**
 * A calendar date, `YYYY-MM-DD`. The value is a plain date string, never a local `Date`, so it
 * means the same day everywhere (dates are UTC across the app; see `@luraba/domain` date helpers).
 */
export function DateInput({
  value,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: string | null | undefined;
  onValueChange: (value: string) => void;
}) {
  return (
    <Input
      {...props}
      type="date"
      value={value ?? ""}
      onChange={(event) => onValueChange(event.target.value)}
    />
  );
}

export { getNumberSeparators };
