"use client";

import { MoneyValue } from "@/components/finance/money-value";
import { cn } from "@/lib/utils";

import {
  AMOUNT_KIND_DISPLAY,
  type AmountKind,
  amountKindForSignedAmount,
  DISPLAY_SIZES,
  type DisplaySize,
} from "./constants";

/**
 * How money is shown everywhere. Pass the amount and what it is:
 * `income` is green with a plus, `expense` is red with a minus, `transfer` and `neutral` have no
 * sign or color. `kind="auto"` decides from the sign of `amount`. The number itself is always
 * formatted from its absolute value, so callers never build signs by hand.
 */
export function AmountDisplay({
  amount,
  currencyCode,
  kind = "neutral",
  size = "sm",
  language = "en",
  precision = 2,
  showSign = true,
  className,
}: {
  /** Minor units. With `kind="auto"` the sign picks income or expense. */
  amount: number;
  currencyCode: string;
  kind?: AmountKind | "auto";
  size?: DisplaySize;
  language?: string;
  precision?: number;
  /** Hide the +/- while keeping the color. */
  showSign?: boolean;
  className?: string;
}) {
  const resolved = kind === "auto" ? amountKindForSignedAmount(amount) : kind;
  const config = AMOUNT_KIND_DISPLAY[resolved];

  return (
    <span
      className={cn("whitespace-nowrap", DISPLAY_SIZES[size].text, config.className, className)}
    >
      {showSign ? config.sign : ""}
      <MoneyValue
        amount={Math.abs(amount)}
        currencyCode={currencyCode}
        language={language}
        precision={precision}
        className="text-inherit"
      />
    </span>
  );
}
