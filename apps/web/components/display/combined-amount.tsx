"use client";

import type { CombinedAmountWire, CombinedFx } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatNumber } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { AmountDisplay } from "./amount-display";
import type { AmountKind, DisplaySize } from "./constants";

type Combined = Pick<CombinedAmountWire, "total" | "byCurrency">;

/** Minor-unit digits of a currency from what the API already told us (no extra request). */
function precisionOf(fx: CombinedFx, currencyCode: string): number {
  if (currencyCode === fx.baseCurrencyCode) return fx.basePrecision;
  const rate = fx.rates.find((item) => item.currencyCode === currencyCode);
  if (rate) return rate.precision;
  return 2; // a currency with no rate (so it is not converted) is shown with the usual two digits
}

/** Whether the figure adds up more than one currency (so the headline is a conversion). */
export function isMixedCombined(combined: Combined, fx: CombinedFx): boolean {
  return combined.byCurrency.some(
    (item) => item.amount !== 0 && item.currencyCode !== fx.baseCurrencyCode,
  );
}

/**
 * The muted note that goes under a combined figure: how it was converted, or why it was not.
 * `null` when everything is already in the base currency.
 */
export function combinedNote(combined: Combined, fx: CombinedFx, language = "en"): string | null {
  if (!isMixedCombined(combined, fx)) return null;
  if (combined.total === null) {
    return `Rate unavailable for ${fx.missingCurrencies.join(", ")}`;
  }
  return fx.asOf ? `≈ converted at ${formatShortDate(fx.asOf, language)}` : "≈ converted";
}

/** The muted line under a combined figure; renders `fallback` when there is nothing to say. */
export function CombinedHint({
  combined,
  fx,
  language = "en",
  fallback = null,
}: {
  combined: Combined;
  fx: CombinedFx;
  language?: string;
  fallback?: React.ReactNode;
}) {
  const note = combinedNote(combined, fx, language);
  return <>{note ?? fallback}</>;
}

const SOURCE_LABEL: Record<string, string> = {
  manual: "set by you",
  frankfurter: "market rate",
  "yahoo-finance2": "market rate",
};

/**
 * One headline number for amounts that may span several currencies: the total in the household base
 * currency, with the per-currency amounts and the rates used one tap away (a popover, so it works on
 * touch). With a single currency it is a plain `AmountDisplay`. When a rate is missing the total is
 * never guessed: each currency is shown on its own.
 */
export function CombinedAmountDisplay({
  combined,
  fx,
  language = "en",
  size = "md",
  kind = "neutral",
  showSign = false,
  className,
}: {
  combined: Combined;
  fx: CombinedFx;
  language?: string;
  size?: DisplaySize;
  kind?: AmountKind | "auto";
  showSign?: boolean;
  className?: string;
}) {
  const show = (amount: number, currencyCode: string, amountSize: DisplaySize = size) => (
    <AmountDisplay
      amount={amount}
      currencyCode={currencyCode}
      kind={kind}
      size={amountSize}
      language={language}
      precision={precisionOf(fx, currencyCode)}
      showSign={showSign}
    />
  );

  if (combined.total === null) {
    const parts = combined.byCurrency.filter((item) => item.amount !== 0);
    return (
      <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
        {parts.map((item, index) => (
          <span key={item.currencyCode}>
            {index > 0 ? <span className="mr-2 text-muted-foreground">+</span> : null}
            {show(item.amount, item.currencyCode)}
          </span>
        ))}
      </span>
    );
  }

  const total = show(combined.total, fx.baseCurrencyCode);
  if (!isMixedCombined(combined, fx)) return <span className={className}>{total}</span>;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "cursor-pointer rounded-sm underline decoration-muted-foreground/50 decoration-dotted underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        aria-label="Show how this total was converted"
      >
        {total}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="font-medium">Added up in {fx.baseCurrencyCode}</p>
          {combined.byCurrency
            .filter((item) => item.amount !== 0)
            .map((item) => (
              <div key={item.currencyCode} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{item.currencyCode}</span>
                {show(item.amount, item.currencyCode, "sm")}
              </div>
            ))}
        </div>
        <div className="flex flex-col gap-1 border-t border-border/60 pt-2 text-muted-foreground">
          {fx.rates.map((rate) => (
            <p key={rate.currencyCode}>
              1 {rate.currencyCode} ={" "}
              {formatNumber(rate.rate, language, { maximumFractionDigits: 6 })}{" "}
              {fx.baseCurrencyCode} · {formatShortDate(rate.rateDate, language)} ·{" "}
              {SOURCE_LABEL[rate.source] ?? rate.source}
            </p>
          ))}
          <p>Approximate: converted at the latest rate and rounded once.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
