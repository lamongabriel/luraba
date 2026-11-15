"use client";

import { formatShortDate } from "@luraba/domain";
import { formatNumber } from "@/lib/finance";
import { cn } from "@/lib/utils";

import { AmountDisplay } from "./amount-display";
import { DISPLAY_SIZES, type DisplaySize } from "./constants";

/** The most digits of a rate shown; the stored rate has more (14 decimals), the text never rounds the amounts. */
const RATE_DIGITS = 8;

/** The rate as text, up to 8 decimals with trailing zeros dropped (`0.17743941`, `5.5311`). */
export function formatFxRate(rate: number, language = "en") {
  return formatNumber(rate, language, { maximumFractionDigits: RATE_DIGITS });
}

/**
 * Money that changed currency: `R$5,495.41 -> $975.16 @ 0.17743941 on 10 Nov 2026`. Always built from the stored
 * original amount, converted amount and rate, never recomputed. `rateDate` is the market day of the rate
 * (it can be before the contribution day when the market was closed).
 */
export function ConversionDisplay({
  originalAmount,
  originalCurrency,
  amount,
  currencyCode,
  fxRate,
  rateDate,
  size = "sm",
  language = "en",
  className,
}: {
  /** Minor units of `originalCurrency`. */
  originalAmount: number;
  originalCurrency: string;
  /** Minor units of `currencyCode`. */
  amount: number;
  currencyCode: string;
  fxRate: number | null;
  rateDate?: string | null;
  size?: DisplaySize;
  language?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-baseline gap-x-1 text-muted-foreground",
        DISPLAY_SIZES[size].text,
        className,
      )}
      data-conversion={`${originalCurrency}-${currencyCode}`}
    >
      <AmountDisplay
        amount={originalAmount}
        currencyCode={originalCurrency}
        size={size}
        language={language}
        showSign={false}
        className="text-muted-foreground"
      />
      <span aria-hidden="true">→</span>
      <AmountDisplay
        amount={amount}
        currencyCode={currencyCode}
        size={size}
        language={language}
        showSign={false}
        className="text-muted-foreground"
      />
      {fxRate === null ? null : (
        <span>
          @ {formatFxRate(fxRate, language)}
          {rateDate ? ` on ${formatShortDate(rateDate, language)}` : ""}
        </span>
      )}
    </span>
  );
}
