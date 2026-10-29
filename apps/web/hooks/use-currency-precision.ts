"use client";

import { MAX_PER_PAGE } from "@luraba/contracts";
import * as React from "react";
import { useCurrenciesQuery } from "@/queries/currencies/use-currencies-query";

/** Minor-unit digits for a currency code (2 until currencies load or when unknown). */
export function useCurrencyPrecision() {
  const query = useCurrenciesQuery({ perPage: MAX_PER_PAGE });
  const currencies = query.data?.data;

  return React.useCallback(
    (currencyCode: string) =>
      currencies?.find((currency) => currency.code === currencyCode)?.precision ?? 2,
    [currencies],
  );
}
