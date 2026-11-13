"use client";

import type { CombinedAmountWire, CombinedFx } from "@luraba/contracts";
import { combineMinorUnits } from "@luraba/domain";
import * as React from "react";
import { useCombinedFxQuery } from "@/queries/fx/use-fx-queries";
import { useDefaultCurrencyCode } from "@/stores/auth-session-store";

/**
 * Turns per-currency amounts a page summed itself into ONE amount in the household base currency,
 * with the same maths and rounding as the API (`combineMinorUnits`). Prefer an API `combined` field
 * when the endpoint has one; this is for totals built on the page from a list.
 *
 * While the rates load `isPending` is true. If they cannot be loaded the figure is not guessed:
 * `combined.total` is `null` and `fx.missingCurrencies` lists the currencies.
 */
export function useCombinedAmount(byCurrency: Readonly<Record<string, number>>): {
  isPending: boolean;
  combined: CombinedAmountWire;
  fx: CombinedFx;
} {
  const fallbackBase = useDefaultCurrencyCode();
  const currencies = Object.keys(byCurrency).sort();
  const query = useCombinedFxQuery(currencies);

  return React.useMemo(() => {
    const missing = Object.keys(byCurrency).filter((code) => code !== fallbackBase);
    const fx: CombinedFx = query.data ?? {
      baseCurrencyCode: fallbackBase,
      basePrecision: 2,
      asOf: null,
      rates: [],
      missingCurrencies: missing.sort(),
    };
    return {
      isPending: query.isPending,
      combined: combineMinorUnits(byCurrency, fx),
      fx,
    };
  }, [query.data, query.isPending, byCurrency, fallbackBase]);
}
