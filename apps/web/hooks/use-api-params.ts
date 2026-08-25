"use client"

import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"
import * as React from "react"

import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import type { SortDirection } from "@/interfaces/api"
import {
  type ApiParamFilterConfigs,
  type ApiParamFilterUpdates,
  type ApiParamFilterValues,
  type ApiParamValue,
  arraysEqual,
  createApiFilterParser,
  getEmptyFilterValue,
  isActiveFilterValue,
  normalizeFilterUpdateValue,
} from "@/lib/api-params"

const DEFAULT_SEARCH_KEY = "search"
const DEFAULT_PAGE_KEY = "page"
const DEFAULT_PER_PAGE_KEY = "perPage"
const DEFAULT_SORT_KEY = "sort"
const DEFAULT_SORT_DIRECTION_KEY = "sortDirection"
const DEFAULT_DEBOUNCE_MS = 300
export interface UseApiParamsOptions<
  TFilters extends ApiParamFilterConfigs = Record<string, never>,
  TSort extends string = string,
> {
  /** Prefixes URL keys so independent tables can share one page safely. */
  keyPrefix?: string
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
  /** Optional single-field API sorting configuration. */
  sorting?: {
    fields: readonly TSort[]
    defaultField?: TSort
    defaultDirection?: SortDirection
    sortKey?: string
    sortDirectionKey?: string
  }
  history?: "push" | "replace"
  shallow?: boolean
  clearOnDefault?: boolean
  /** Lets a default filter stay cleared for the current hook instance. */
  suppressDefaultFiltersOnClear?: boolean
}

export interface UseApiParamsReturn<
  TFilters extends ApiParamFilterConfigs = Record<string, never>,
  TSort extends string = string,
> {
  /** Immediate (not debounced) search value - bind this to the search input. */
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
  /** Current API sort field, or undefined when no explicit/default sort exists. */
  sort: TSort | undefined
  sortDirection: SortDirection
  /** Replaces the current sort. Only one field can be active at a time. */
  setSorting: (field: TSort | undefined, direction?: SortDirection) => void
}

/**
 * URL-synced list params for simple list pages (search, and optionally
 * page/perPage and flat filters) - the lighter-weight sibling of `useDataTable`
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
  TSort extends string = string,
>(
  options: UseApiParamsOptions<TFilters, TSort> = {},
): UseApiParamsReturn<TFilters, TSort> {
  const {
    keyPrefix,
    searchKey = DEFAULT_SEARCH_KEY,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    filters: filterConfigs,
    pagination = false,
    pageKey = DEFAULT_PAGE_KEY,
    perPageKey = DEFAULT_PER_PAGE_KEY,
    defaultPerPage = 20,
    sorting,
    history = "replace",
    shallow = true,
    clearOnDefault = true,
    suppressDefaultFiltersOnClear = false,
  } = options
  const scopeKey = React.useCallback(
    (key: string) =>
      keyPrefix
        ? `${keyPrefix}${key.charAt(0).toUpperCase()}${key.slice(1)}`
        : key,
    [keyPrefix],
  )
  const searchUrlKey = scopeKey(searchKey)
  const pageUrlKey = scopeKey(pageKey)
  const perPageUrlKey = scopeKey(perPageKey)
  const sortApiKey = sorting?.sortKey ?? DEFAULT_SORT_KEY
  const sortDirectionApiKey =
    sorting?.sortDirectionKey ?? DEFAULT_SORT_DIRECTION_KEY
  const sortKey = scopeKey(sorting?.sortKey ?? DEFAULT_SORT_KEY)
  const sortDirectionKey = scopeKey(
    sorting?.sortDirectionKey ?? DEFAULT_SORT_DIRECTION_KEY,
  )
  const defaultSortDirection = sorting?.defaultDirection ?? "asc"
  const [defaultsSuppressed, setDefaultsSuppressed] = React.useState(false)

  const queryStateOptions = { history, shallow, clearOnDefault }

  const filterParsers = React.useMemo(() => {
    return Object.fromEntries(
      Object.entries(filterConfigs ?? {}).map(([key, config]) => [
        scopeKey(key),
        createApiFilterParser(config),
      ]),
    )
  }, [filterConfigs, scopeKey])

  const [urlState, setQueryStates] = useQueryStates(
    {
      [searchUrlKey]: parseAsString.withDefault(""),
      ...filterParsers,
      ...(pagination
        ? {
            [pageUrlKey]: parseAsInteger.withDefault(1),
            [perPageUrlKey]: parseAsInteger.withDefault(defaultPerPage),
          }
        : {}),
      ...(sorting
        ? {
            [sortKey]: sorting.defaultField
              ? parseAsStringLiteral(sorting.fields).withDefault(
                  sorting.defaultField,
                )
              : parseAsStringLiteral(sorting.fields),
            [sortDirectionKey]: parseAsStringLiteral([
              "asc",
              "desc",
            ] as const).withDefault(defaultSortDirection),
          }
        : {}),
    },
    queryStateOptions,
  )

  const urlSearch = urlState[searchUrlKey] as string
  const page = pagination ? (urlState[pageUrlKey] as number) : 1
  const perPage = pagination
    ? (urlState[perPageUrlKey] as number)
    : defaultPerPage
  const sort = sorting
    ? ((urlState[sortKey] as TSort | null) ?? undefined)
    : undefined
  const sortDirection = sorting
    ? (urlState[sortDirectionKey] as SortDirection)
    : defaultSortDirection
  const filters = React.useMemo(() => {
    return Object.fromEntries(
      Object.keys(filterConfigs ?? {}).map((key) => {
        const value = urlState[scopeKey(key)]
        const defaultValue = filterConfigs?.[key]?.defaultValue
        const isSuppressed =
          defaultsSuppressed &&
          suppressDefaultFiltersOnClear &&
          defaultValue !== undefined &&
          (Array.isArray(value)
            ? arraysEqual(value, defaultValue)
            : value === defaultValue)

        return [key, isSuppressed ? getEmptyFilterValue(value) : value]
      }),
    ) as ApiParamFilterValues<TFilters>
  }, [
    defaultsSuppressed,
    filterConfigs,
    scopeKey,
    suppressDefaultFiltersOnClear,
    urlState,
  ])

  // Keep the search input responsive while debouncing the URL write.
  const [search, setSearchState] = React.useState(urlSearch)
  const normalizedSearch = React.useMemo(
    () => search.trim().toLowerCase(),
    [search],
  )

  React.useEffect(() => {
    setSearchState(urlSearch)
  }, [urlSearch])

  const debouncedSetSearch = useDebouncedCallback(
    (value: string) => void setQueryStates({ [searchUrlKey]: value || null }),
    debounceMs,
  )

  const setSearch = React.useCallback(
    (value: string) => {
      setSearchState(value)
      debouncedSetSearch(value)
      if (pagination) {
        void setQueryStates({ [pageUrlKey]: null })
      }
    },
    [debouncedSetSearch, pageUrlKey, pagination, setQueryStates],
  )

  const clearSearch = React.useCallback(() => {
    debouncedSetSearch.cancel()
    setSearchState("")
    void setQueryStates({
      [searchUrlKey]: null,
      ...(pagination ? { [pageUrlKey]: null } : {}),
    })
  }, [debouncedSetSearch, pageUrlKey, pagination, searchUrlKey, setQueryStates])

  const setFilter = React.useCallback(
    <Key extends keyof TFilters>(
      key: Key,
      value: ApiParamFilterValues<TFilters>[Key] | null,
    ) => {
      if (
        suppressDefaultFiltersOnClear &&
        value !== null &&
        filterConfigs?.[key as string]?.defaultValue !== undefined
      ) {
        setDefaultsSuppressed(false)
      }
      void setQueryStates({
        [scopeKey(key as string)]: normalizeFilterUpdateValue(value),
        ...(pagination ? { [pageUrlKey]: null } : {}),
      })
    },
    [
      filterConfigs,
      pageUrlKey,
      pagination,
      scopeKey,
      setQueryStates,
      suppressDefaultFiltersOnClear,
    ],
  )

  const setFilters = React.useCallback(
    (updates: ApiParamFilterUpdates<TFilters>) => {
      if (
        suppressDefaultFiltersOnClear &&
        Object.entries(updates).some(
          ([key, value]) =>
            value !== null && filterConfigs?.[key]?.defaultValue !== undefined,
        )
      ) {
        setDefaultsSuppressed(false)
      }
      void setQueryStates({
        ...Object.fromEntries(
          Object.entries(updates).map(([key, value]) => [
            scopeKey(key),
            normalizeFilterUpdateValue(value),
          ]),
        ),
        ...(pagination ? { [pageUrlKey]: null } : {}),
      })
    },
    [
      filterConfigs,
      pageUrlKey,
      pagination,
      scopeKey,
      setQueryStates,
      suppressDefaultFiltersOnClear,
    ],
  )

  const clearFilters = React.useCallback(() => {
    debouncedSetSearch.cancel()
    setSearchState("")
    if (suppressDefaultFiltersOnClear) setDefaultsSuppressed(true)
    void setQueryStates({
      [searchUrlKey]: null,
      ...Object.fromEntries(
        Object.keys(filterConfigs ?? {}).map((key) => [scopeKey(key), null]),
      ),
      ...(pagination ? { [pageUrlKey]: null } : {}),
    })
  }, [
    debouncedSetSearch,
    filterConfigs,
    pageUrlKey,
    pagination,
    scopeKey,
    setQueryStates,
    searchUrlKey,
    suppressDefaultFiltersOnClear,
  ])

  const setPage = React.useCallback(
    (nextPage: number) => {
      void setQueryStates({ [pageUrlKey]: nextPage === 1 ? null : nextPage })
    },
    [pageUrlKey, setQueryStates],
  )

  const setPerPage = React.useCallback(
    (nextPerPage: number) => {
      void setQueryStates({
        [perPageUrlKey]: nextPerPage === defaultPerPage ? null : nextPerPage,
        [pageUrlKey]: null,
      })
    },
    [defaultPerPage, pageUrlKey, perPageUrlKey, setQueryStates],
  )

  const setSorting = React.useCallback(
    (field: TSort | undefined, direction = defaultSortDirection) => {
      if (!sorting) return

      void setQueryStates({
        [sortKey]: field ?? null,
        [sortDirectionKey]: field ? direction : null,
        ...(pagination ? { [pageUrlKey]: null } : {}),
      })
    },
    [
      defaultSortDirection,
      pageUrlKey,
      pagination,
      setQueryStates,
      sortDirectionKey,
      sortKey,
      sorting,
    ],
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
    normalizedSearch.length > 0 || activeFilterEntries.length > 0

  const apiParams = React.useMemo(() => {
    const nextParams: Record<string, ApiParamValue> = {}
    const apiSearch = urlSearch.trim()

    if (apiSearch) {
      nextParams[searchKey] = apiSearch
    }

    for (const [key, value] of activeFilterEntries) {
      nextParams[key] = value as ApiParamValue
    }

    if (pagination) {
      nextParams[pageKey] = page
      nextParams[perPageKey] = perPage
    }

    if (sort) {
      nextParams[sortApiKey] = sort
      nextParams[sortDirectionApiKey] = sortDirection
    }

    return nextParams
  }, [
    activeFilterEntries,
    page,
    pageKey,
    pagination,
    perPage,
    perPageKey,
    searchKey,
    sort,
    sortApiKey,
    sortDirection,
    sortDirectionApiKey,
    urlSearch,
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
    sort,
    sortDirection,
    setSorting,
  }
}
