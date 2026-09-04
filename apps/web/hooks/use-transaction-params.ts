"use client"

import type { TransactionSortField } from "@luraba/contracts"
import { useSearchParams } from "next/navigation"
import * as React from "react"
import {
  TRANSACTION_FILTERS,
  TRANSACTION_SORT_FIELDS,
  type TransactionTableFilters,
  type TransactionTableFilterUpdates,
} from "@/components/tables/transactions/transactions-table-filters"
import { useApiParams } from "@/hooks/use-api-params"
import { getPreferredTransactionDateRange } from "@/lib/transaction-period"
import { useAuthSessionStore } from "@/stores/auth-session-store"

export function useTransactionParams() {
  const bootstrapStatus = useAuthSessionStore((state) => state.bootstrapStatus)
  const preferences = useAuthSessionStore((state) => state.user?.preferences)
  const searchParams = useSearchParams()
  const clearedDefaultPeriod = React.useRef(false)
  const initializedDefaultPeriod = React.useRef(false)
  const params = useApiParams({
    filters: TRANSACTION_FILTERS,
    pagination: true,
    defaultPerPage: 20,
    sorting: {
      fields: TRANSACTION_SORT_FIELDS,
      defaultField: "postedDate",
      defaultDirection: "desc",
    },
  })

  const urlDateFrom = searchParams.get("dateFrom") ?? ""
  const urlDateTo = searchParams.get("dateTo") ?? ""
  const hasExplicitDateFilters = Boolean(urlDateFrom || urlDateTo)
  const preferredPeriod = preferences?.preferredPeriod
  const preferredTimezone = preferences?.timezone
  const preferencesReady =
    bootstrapStatus === "authenticated" && Boolean(preferences)
  const preferredRange = React.useMemo(() => {
    if (!preferredPeriod || !preferredTimezone) return undefined

    return getPreferredTransactionDateRange(preferredPeriod, preferredTimezone)
  }, [preferredPeriod, preferredTimezone])

  const isUsingDefaultPeriod =
    !hasExplicitDateFilters &&
    !clearedDefaultPeriod.current &&
    preferencesReady &&
    Boolean(preferredRange?.dateFrom || preferredRange?.dateTo)
  const currentFilters = params.filters as TransactionTableFilters
  const filters = React.useMemo(() => {
    if (hasExplicitDateFilters) {
      return {
        ...currentFilters,
        dateFrom: urlDateFrom || currentFilters.dateFrom,
        dateTo: urlDateTo || currentFilters.dateTo,
      }
    }

    if (!isUsingDefaultPeriod || !preferredRange) return currentFilters

    return {
      ...currentFilters,
      dateFrom: preferredRange.dateFrom ?? "",
      dateTo: preferredRange.dateTo ?? "",
    }
  }, [
    currentFilters,
    hasExplicitDateFilters,
    isUsingDefaultPeriod,
    preferredRange,
    urlDateFrom,
    urlDateTo,
  ])

  const apiParams = React.useMemo(() => {
    if (hasExplicitDateFilters) {
      return {
        ...params.apiParams,
        ...(urlDateFrom ? { dateFrom: urlDateFrom } : {}),
        ...(urlDateTo ? { dateTo: urlDateTo } : {}),
      }
    }

    if (!isUsingDefaultPeriod || !preferredRange) return params.apiParams

    return {
      ...params.apiParams,
      ...(preferredRange.dateFrom ? { dateFrom: preferredRange.dateFrom } : {}),
      ...(preferredRange.dateTo ? { dateTo: preferredRange.dateTo } : {}),
    }
  }, [
    hasExplicitDateFilters,
    isUsingDefaultPeriod,
    params.apiParams,
    preferredRange,
    urlDateFrom,
    urlDateTo,
  ])

  React.useEffect(() => {
    if (initializedDefaultPeriod.current || clearedDefaultPeriod.current) return
    if (hasExplicitDateFilters) {
      initializedDefaultPeriod.current = true
      return
    }
    if (!preferencesReady || !preferredRange) return

    initializedDefaultPeriod.current = true
    if (preferredRange.dateFrom || preferredRange.dateTo) {
      params.setFilters(preferredRange)
    }
  }, [
    hasExplicitDateFilters,
    params.setFilters,
    preferredRange,
    preferencesReady,
  ])

  const setFilters = React.useCallback(
    (updates: TransactionTableFilterUpdates) => {
      params.setFilters(updates)
    },
    [params.setFilters],
  )

  const clearFilters = React.useCallback(() => {
    clearedDefaultPeriod.current = true
    params.clearFilters()
  }, [params.clearFilters])

  return {
    ...params,
    filters,
    apiParams,
    hasFilters: params.hasFilters || isUsingDefaultPeriod,
    ready: preferencesReady,
    setFilters,
    clearFilters,
    sort: params.sort as TransactionSortField | undefined,
  }
}
