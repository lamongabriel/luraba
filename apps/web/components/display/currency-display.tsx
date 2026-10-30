"use client";

import { type CurrencyInfo, resolveCurrency } from "@luraba/contracts";
import { useCurrencyCatalog } from "@/hooks/use-currency-catalog";
import { cn } from "@/lib/utils";

import { DISPLAY_SIZES, type DisplaySize } from "./constants";

/** The flag, code and symbol of a resolved currency. Shared by the display and the select. */
export function CurrencyLabel({
  currency,
  showName = false,
  size = "sm",
  className,
}: {
  currency: CurrencyInfo;
  showName?: boolean;
  size?: DisplaySize;
  className?: string;
}) {
  const dims = DISPLAY_SIZES[size];
  return (
    <span
      className={cn("inline-flex min-w-0 items-center", dims.gap, dims.text, className)}
      data-currency={currency.code}
    >
      {currency.flag ? (
        <span aria-hidden="true" className="shrink-0 leading-none">
          {currency.flag}
        </span>
      ) : null}
      <span className="shrink-0 font-medium">{currency.code}</span>
      {currency.symbol && currency.symbol !== currency.code ? (
        <span className="shrink-0 text-muted-foreground">{currency.symbol}</span>
      ) : null}
      {showName && currency.name !== currency.code ? (
        <span className={cn("truncate text-muted-foreground", dims.subtext)}>{currency.name}</span>
      ) : null}
    </span>
  );
}

/**
 * How a currency is shown everywhere: country flag, 3-letter code and symbol (`🇧🇷 BRL R$`).
 * Symbols come from the API when loaded, else from the catalog in `@luraba/contracts` (`catalogs/currencies.ts`).
 */
export function CurrencyDisplay({
  currencyCode,
  showName = false,
  size = "sm",
  className,
}: {
  currencyCode: string;
  /** Adds the currency name after the symbol. */
  showName?: boolean;
  size?: DisplaySize;
  className?: string;
}) {
  const { get } = useCurrencyCatalog();
  return (
    <CurrencyLabel
      currency={get(currencyCode)}
      showName={showName}
      size={size}
      className={className}
    />
  );
}

/** Same as `CurrencyDisplay` for places that already hold the API row or have no query client. */
export function StaticCurrencyDisplay({
  currencyCode,
  symbol,
  ...props
}: {
  currencyCode: string;
  symbol?: string;
  showName?: boolean;
  size?: DisplaySize;
  className?: string;
}) {
  return (
    <CurrencyLabel
      currency={resolveCurrency(currencyCode, symbol ? { symbol, precision: 2 } : null)}
      {...props}
    />
  );
}
