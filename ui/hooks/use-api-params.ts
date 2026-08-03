"use client"

import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsFloat,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs"
import * as React from "react"

import { useDebouncedCallback } from "@/hooks/use-debounced-callback"

const DEFAULT_SEARCH_KEY = "search"
const DEFAULT_PAGE_KEY = "page"
const DEFAULT_PER_PAGE_KEY = "perPage"
const DEFAULT_DEBOUNCE_MS = 300
const DEFAULT_ARRAY_SEPARATOR = ","

type ApiParamFilterConfig =
  | { type: "boolean"; defaultValue?: boolean }
  | { type: "float"; defaultValue?: number }
  | { type: "floatArray"; defaultValue?: number[]; separator?: string }
  | { type: "integer"; defaultValue?: number }
  | { type: "integerArray"; defaultValue?: number[]; separator?: string }
  | { type: "string"; defaultValue?: string }
  | { type: "stringArray"; defaultValue?: string[]; separator?: string }

type ApiParamFilterConfigs = Record<string, ApiParamFilterConfig>

type ApiParamFilterValue<TConfig extends ApiParamFilterConfig> =
  TConfig["type"] extends "string"
    ? string
    : TConfig["type"] extends "stringArray"
      ? string[]
      : TConfig["type"] extends "integerArray" | "floatArray"
        ? number[]
        : TConfig["type"] extends "integer" | "float"
          ? number | null
          : TConfig["type"] extends "boolean"
            ? boolean | null
            : never

type ApiParamFilterValues<TFilters extends ApiParamFilterConfigs> = {
  [Key in keyof TFilters]: ApiParamFilterValue<TFilters[Key]>
}

type ApiParamFilterUpdates<TFilters extends ApiParamFilterConfigs> = Partial<{
  [Key in keyof TFilters]: ApiParamFilterValues<TFilters>[Key] | null
}>

type ApiParamValue = boolean | number | number[] | string | string[]

export interface UseApiParamsOptions<
  TFilters extends ApiParamFilterConfigs = Record<string, never>,
> {
  /** URL query key for the search value. Defaults to `"search"`. */
  searchKey?: string
  /** Debounce delay (ms) before the search value is written to the URL. */
  debounceMs?: number
  /** URL-backed structured filters, keyed by their API/query-string name. */
  filters?: TFilters
  /** Enables page/perPage URL state. Defaults to `false` (most simple list
   * pages fetch everything and filter client-side, no pagination needed). */
  pagination?: boolean
  /** URL query key for the page number. Defaults to `"page"`. */
  pageKey?: string
  /** URL query key for the page size. Defaults to `"perPage"`. */
  perPageKey?: string
  /** Initial/default page size when `pagination` is enabled. */
  defaultPerPage?: number
  history?: "push" | "replace"
  shallow?: boolean
  clearOnDefault?: boolean
}

export interface UseApiParamsReturn<
  TFilters extends ApiParamFilterConfigs = Record<string, never>,
> {
  /** Immediate (not debounced) search value — bind this to the search input. */
  search: string
  /** Lowercase trimmed search value for local matching. */
  normalizedSearch: string
  /** Updates the search value immediately and writes to the URL (debounced). */
  setSearch: (value: string) => void
  /** Clears the search value immediately. */
  clearSearch: () => void
  /** URL-backed structured filter values. */
  filters: ApiParamFilterValues<TFilters>
  /** Updates one structured filter and clears pagination back to page 1. */
  setFilter: <Key extends keyof TFilters>(
    key: Key,
    value: ApiParamFilterValues<TFilters>[Key] | null,
  ) => void
  /** Updates multiple structured filters and clears pagination back to page 1. */
  setFilters: (updates: ApiParamFilterUpdates<TFilters>) => void
  /** Clears search and every structured filter. */
  clearFilters: () => void
  /** True when any param differs from its default (useful for empty states). */
  hasFilters: boolean
  /** Active API params with empty/default filters omitted. */
  apiParams: Record<string, ApiParamValue>
  /** Current page (1-based). Only meaningful when `pagination` is enabled. */
  page: number
  /** Sets the current page. Only meaningful when `pagination` is enabled. */
  setPage: (page: number) => void
  /** Current page size. Only meaningful when `pagination` is enabled. */
  perPage: number
  /** Sets the page size. Only meaningful when `pagination` is enabled. */
  setPerPage: (perPage: number) => void
}

/**
 * URL-synced list params for simple list pages (search, and optionally
 * page/perPage and flat filters) — the lighter-weight sibling of `useDataTable`
 * for pages that don't need a full TanStack Table (e.g. categories, tags).
 *
 *   const { search, setSearch, hasFilters } = useApiParams()
 *   const { filters, setFilter } = useApiParams({
 *     filters: { type: { type: "stringArray" } },
 *   })
 *
 *   <Input value={search} onChange={(e) => setSearch(e.target.value)} />
 */
export function useApiParams<
  TFilters extends ApiParamFilterConfigs = Record<string, never>,
>(options: UseApiParamsOptions<TFilters> = {}): UseApiParamsReturn<TFilters> {
  const {
    searchKey = DEFAULT_SEARCH_KEY,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    filters: filterConfigs,
    pagination = false,
    pageKey = DEFAULT_PAGE_KEY,
    perPageKey = DEFAULT_PER_PAGE_KEY,
    defaultPerPage = 20,
    history = "replace",
    shallow = true,
    clearOnDefault = true,
  } = options

  const queryStateOptions = { history, shallow, clearOnDefault }

  const filterParsers = React.useMemo(() => {
    return Object.fromEntries(
      Object.entries(filterConfigs ?? {}).map(([key, config]) => [
        key,
        createApiFilterParser(config),
      ]),
    )
  }, [filterConfigs])

  const [urlState, setQueryStates] = useQueryStates(
    {
      [searchKey]: parseAsString.withDefault(""),
      ...filterParsers,
      ...(pagination
        ? {
            [pageKey]: parseAsInteger.withDefault(1),
            [perPageKey]: parseAsInteger.withDefault(defaultPerPage),
          }
        : {}),
    },
    queryStateOptions,
  )

  const urlSearch = urlState[searchKey] as string
  const page = pagination ? (urlState[pageKey] as number) : 1
  const perPage = pagination ? (urlState[perPageKey] as number) : defaultPerPage
  const filters = React.useMemo(() => {
    return Object.fromEntries(
      Object.keys(filterConfigs ?? {}).map((key) => [key, urlState[key]]),
    ) as ApiParamFilterValues<TFilters>
  }, [filterConfigs, urlState])

  // Keep the search input responsive while debouncing the URL write.
  const [search, setSearchState] = React.useState(urlSearch)
  const normalizedSearch = React.useMemo(
    () => search.trim().toLowerCase(),
    [search],
  )

  const debouncedSetSearch = useDebouncedCallback(
    (value: string) => void setQueryStates({ [searchKey]: value || null }),
    debounceMs,
  )

  const setSearch = React.useCallback(
    (value: string) => {
      setSearchState(value)
      debouncedSetSearch(value)
      if (pagination) {
        void setQueryStates({ [pageKey]: null })
      }
    },
    [debouncedSetSearch, pageKey, pagination, setQueryStates],
  )

  const clearSearch = React.useCallback(() => {
    setSearchState("")
    void setQueryStates({ [searchKey]: null })
  }, [searchKey, setQueryStates])

  const setFilter = React.useCallback(
    <Key extends keyof TFilters>(
      key: Key,
      value: ApiParamFilterValues<TFilters>[Key] | null,
    ) => {
      void setQueryStates({
        [key as string]: normalizeFilterUpdateValue(value),
        ...(pagination ? { [pageKey]: null } : {}),
      })
    },
    [pageKey, pagination, setQueryStates],
  )

  const setFilters = React.useCallback(
    (updates: ApiParamFilterUpdates<TFilters>) => {
      void setQueryStates({
        ...Object.fromEntries(
          Object.entries(updates).map(([key, value]) => [
            key,
            normalizeFilterUpdateValue(value),
          ]),
        ),
        ...(pagination ? { [pageKey]: null } : {}),
      })
    },
    [pageKey, pagination, setQueryStates],
  )

  const clearFilters = React.useCallback(() => {
    setSearchState("")
    void setQueryStates({
      [searchKey]: null,
      ...Object.fromEntries(
        Object.keys(filterConfigs ?? {}).map((key) => [key, null]),
      ),
      ...(pagination ? { [pageKey]: null } : {}),
    })
  }, [filterConfigs, pageKey, pagination, searchKey, setQueryStates])

  const setPage = React.useCallback(
    (nextPage: number) => {
      void setQueryStates({ [pageKey]: nextPage === 1 ? null : nextPage })
    },
    [pageKey, setQueryStates],
  )

  const setPerPage = React.useCallback(
    (nextPerPage: number) => {
      void setQueryStates({
        [perPageKey]: nextPerPage === defaultPerPage ? null : nextPerPage,
        [pageKey]: null,
      })
    },
    [defaultPerPage, pageKey, perPageKey, setQueryStates],
  )

  const activeFilterEntries = React.useMemo(() => {
    return Object.entries(filters).filter(([key, value]) =>
      isActiveFilterValue(
        value,
        filterConfigs?.[key]?.defaultValue ?? getEmptyFilterValue(value),
      ),
    )
  }, [filterConfigs, filters])

  const hasFilters =
    normalizedSearch.length > 0 ||
    activeFilterEntries.length > 0 ||
    (pagination && page !== 1)

  const apiParams = React.useMemo(() => {
    const nextParams: Record<string, ApiParamValue> = {}

    if (normalizedSearch) {
      nextParams[searchKey] = normalizedSearch
    }

    for (const [key, value] of activeFilterEntries) {
      nextParams[key] = value as ApiParamValue
    }

    if (pagination) {
      nextParams[pageKey] = page
      nextParams[perPageKey] = perPage
    }

    return nextParams
  }, [
    activeFilterEntries,
    normalizedSearch,
    page,
    pageKey,
    pagination,
    perPage,
    perPageKey,
    searchKey,
  ])

  return {
    search,
    normalizedSearch,
    setSearch,
    clearSearch,
    filters,
    setFilter,
    setFilters,
    clearFilters,
    hasFilters,
    apiParams,
    page,
    setPage,
    perPage,
    setPerPage,
  }
}

function createApiFilterParser(config: ApiParamFilterConfig) {
  switch (config.type) {
    case "boolean":
      return config.defaultValue === undefined
        ? parseAsBoolean
        : parseAsBoolean.withDefault(config.defaultValue)
    case "float":
      return config.defaultValue === undefined
        ? parseAsFloat
        : parseAsFloat.withDefault(config.defaultValue)
    case "floatArray":
      return parseAsArrayOf(
        parseAsFloat,
        config.separator ?? DEFAULT_ARRAY_SEPARATOR,
      ).withDefault(config.defaultValue ?? [])
    case "integer":
      return config.defaultValue === undefined
        ? parseAsInteger
        : parseAsInteger.withDefault(config.defaultValue)
    case "integerArray":
      return parseAsArrayOf(
        parseAsInteger,
        config.separator ?? DEFAULT_ARRAY_SEPARATOR,
      ).withDefault(config.defaultValue ?? [])
    case "string":
      return parseAsString.withDefault(config.defaultValue ?? "")
    case "stringArray":
      return parseAsArrayOf(
        parseAsString,
        config.separator ?? DEFAULT_ARRAY_SEPARATOR,
      ).withDefault(config.defaultValue ?? [])
  }
}

function normalizeFilterUpdateValue(value: unknown): ApiParamValue | null {
  if (Array.isArray(value)) {
    return value.length > 0 ? value : null
  }

  if (typeof value === "string") {
    return value.trim().length > 0 ? value : null
  }

  return (value as ApiParamValue | null | undefined) ?? null
}

function getEmptyFilterValue(value: unknown) {
  if (Array.isArray(value)) return []
  if (typeof value === "string") return ""
  return null
}

function isActiveFilterValue(value: unknown, defaultValue: unknown) {
  if (Array.isArray(value)) {
    return value.length > 0 && !arraysEqual(value, defaultValue)
  }

  if (typeof value === "string") {
    return value.trim().length > 0 && value !== defaultValue
  }

  return value !== null && value !== undefined && value !== defaultValue
}

function arraysEqual(left: unknown[], right: unknown) {
  return (
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}
