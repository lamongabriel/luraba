"use client";

import type { TransactionSortField } from "@luraba/contracts";
import * as React from "react";
import { useDateFilter } from "@/components/filters";
import { useFilters } from "@/components/filters/use-filters";
import {
  TRANSACTION_FILTER_IDS,
  TRANSACTION_SORT_FIELDS,
  toTransactionApiParams,
} from "@/components/tables/transactions/transactions-table-filters";
import { useApiParams } from "@/hooks/use-api-params";
import type { ApiParamValue } from "@/lib/api-params";

/**
 * Everything the transactions page reads from the URL: search, page, sort, the filter chips and the required date
 * filter ("This month", widened to the open billing cycles, until the user edits it). `apiParams` is the list query.
 */
export function useTransactionParams() {
  const params = useApiParams({
    pagination: true,
    defaultPerPage: 20,
    sorting: {
      fields: TRANSACTION_SORT_FIELDS,
      defaultField: "postedDate",
      defaultDirection: "desc",
    },
  });
  const filters = useFilters({ fieldIds: TRANSACTION_FILTER_IDS });
  // "This month" always opens the page, and reaches back to the earliest open credit card cycle (see filters README).
  const date = useDateFilter({ defaultPeriod: "current_month", billingCycles: true });

  const apiParams = React.useMemo<Record<string, ApiParamValue>>(
    () => ({
      ...params.apiParams,
      ...toTransactionApiParams(filters.values),
      ...(date.dateFrom ? { dateFrom: date.dateFrom } : {}),
      ...(date.dateTo ? { dateTo: date.dateTo } : {}),
    }),
    [params.apiParams, filters.values, date.dateFrom, date.dateTo],
  );

  const clearSearch = params.clearSearch;
  const clearFilters = filters.clear;
  const clearAll = React.useCallback(() => {
    clearFilters();
    clearSearch();
  }, [clearFilters, clearSearch]);

  return {
    ...params,
    filters,
    date,
    apiParams,
    /** Chips or a search are applied (the date filter always is, so it does not count). */
    hasFilters: filters.hasFilters || params.search.trim().length > 0,
    ready: date.ready,
    clearFilters: clearAll,
    sort: params.sort as TransactionSortField | undefined,
  };
}
