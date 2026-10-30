"use client";

import * as React from "react";

import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { useAuthSessionStore } from "@/stores/auth-session-store";

import { formatPercent, formatQuantity, formatSignedPercent, formatUnitPrice } from "./format";

/** Language and currency precision bundled once, so tables do not repeat the lookups. */
export function useInvestmentFormat() {
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const precisionOf = useCurrencyPrecision();

  return React.useMemo(
    () => ({
      language,
      precisionOf,
      percent: (value: string | number | null | undefined) => formatPercent(value, language),
      signedPercent: (value: string | number | null | undefined) =>
        formatSignedPercent(value, language),
      quantity: (value: string | number | null | undefined, maxDecimals?: number) =>
        formatQuantity(value, language, maxDecimals),
      unitPrice: (value: string | number | null | undefined, currencyCode: string) =>
        formatUnitPrice(value, currencyCode, language),
    }),
    [language, precisionOf],
  );
}
