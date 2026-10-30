"use client";

import { type CurrencyInfo, MAX_PER_PAGE, resolveCurrency } from "@luraba/contracts";
import * as React from "react";
import { useCurrenciesQuery } from "@/queries/currencies/use-currencies-query";

/**
 * The currencies the household can use (from the API), each merged with its catalog name and flag.
 * `get` also works for codes the API has not returned (yet): it falls back to the static catalog.
 */
export function useCurrencyCatalog() {
  const query = useCurrenciesQuery({ perPage: MAX_PER_PAGE });
  const rows = query.data?.data;

  const currencies = React.useMemo<CurrencyInfo[]>(
    () => (rows ?? []).map((row) => resolveCurrency(row.code, row)),
    [rows],
  );
  const get = React.useCallback(
    (code: string) =>
      resolveCurrency(
        code,
        rows?.find((row) => row.code === code),
      ),
    [rows],
  );

  return { currencies, get, isPending: query.isPending, isError: query.isError };
}
