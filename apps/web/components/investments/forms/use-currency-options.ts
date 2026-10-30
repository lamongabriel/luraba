"use client";

import { MAX_PER_PAGE } from "@luraba/contracts";
import * as React from "react";

import { useCurrenciesQuery } from "@/queries/currencies/use-currencies-query";

/** Currency choices for selects: `USD ($)`. */
export function useCurrencyOptions() {
  const query = useCurrenciesQuery({ perPage: MAX_PER_PAGE });
  return React.useMemo(
    () =>
      (query.data?.data ?? []).map((currency) => ({
        value: currency.code,
        label: `${currency.code} (${currency.symbol})`,
      })),
    [query.data],
  );
}
