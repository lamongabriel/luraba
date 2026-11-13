"use client";

import type { SortDirection } from "@luraba/contracts";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import * as React from "react";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import type { ApiParamValue } from "@/lib/api-params";

const DEFAULT_SEARCH_KEY = "search";
const DEFAULT_PAGE_KEY = "page";
const DEFAULT_PER_PAGE_KEY = "perPage";
const DEFAULT_SORT_KEY = "sort";
const DEFAULT_SORT_DIRECTION_KEY = "sortDirection";
const DEFAULT_DEBOUNCE_MS = 300;
export interface UseApiParamsOptions<TSort extends string = string> {
  /** Prefixes URL keys so independent tables can share one page safely. */
  keyPrefix?: string;
  /** URL query key for the search value. Defaults to `"search"`. */
  searchKey?: string;
  /** Debounce delay (ms) before the search value is written to the URL. */
  debounceMs?: number;
  /** Enables page/perPage URL state. Defaults to `false` (most simple list
   * pages fetch everything and filter client-side, no pagination needed). */
  pagination?: boolean;
  /** URL query key for the page number. Defaults to `"page"`. */
  pageKey?: string;
  /** URL query key for the page size. Defaults to `"perPage"`. */
  perPageKey?: string;
  /** Initial/default page size when `pagination` is enabled. */
  defaultPerPage?: number;
  /** Optional single-field API sorting configuration. */
  sorting?: {
    fields: readonly TSort[];
    defaultField?: TSort;
    defaultDirection?: SortDirection;
    sortKey?: string;
    sortDirectionKey?: string;
  };
  history?: "push" | "replace";
  shallow?: boolean;
  clearOnDefault?: boolean;
}

export interface UseApiParamsReturn<TSort extends string = string> {
  /** Immediate (not debounced) search value - bind this to the search input. */
  search: string;
  /** Lowercase trimmed search value for local matching. */
  normalizedSearch: string;
  /** Updates the search value immediately and writes to the URL (debounced). */
  setSearch: (value: string) => void;
  /** Clears the search value immediately. */
  clearSearch: () => void;
  /** Active API params with empty/default filters omitted. */
  apiParams: Record<string, ApiParamValue>;
  /** Current page (1-based). Only meaningful when `pagination` is enabled. */
  page: number;
  /** Sets the current page. Only meaningful when `pagination` is enabled. */
  setPage: (page: number) => void;
  /** Current page size. Only meaningful when `pagination` is enabled. */
  perPage: number;
  /** Sets the page size. Only meaningful when `pagination` is enabled. */
  setPerPage: (perPage: number) => void;
  /** Current API sort field, or undefined when no explicit/default sort exists. */
  sort: TSort | undefined;
  sortDirection: SortDirection;
  /** Replaces the current sort. Only one field can be active at a time. */
  setSorting: (field: TSort | undefined, direction?: SortDirection) => void;
}

/**
 * URL-synced list params for list pages: search, and optionally page/perPage and sort - the lighter-weight sibling
 * of `useDataTable` for pages that don't need a full TanStack Table (e.g. categories, tags). Filters are not here:
 * the chips and the date filter live in `components/filters` (`useFilters`, `useDateFilter`).
 *
 *   const { search, setSearch } = useApiParams()
 *
 *   <Input value={search} onChange={(e) => setSearch(e.target.value)} />
 */
export function useApiParams<TSort extends string = string>(
  options: UseApiParamsOptions<TSort> = {},
): UseApiParamsReturn<TSort> {
  const {
    keyPrefix,
    searchKey = DEFAULT_SEARCH_KEY,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    pagination = false,
    pageKey = DEFAULT_PAGE_KEY,
    perPageKey = DEFAULT_PER_PAGE_KEY,
    defaultPerPage = 20,
    sorting,
    history = "replace",
    shallow = true,
    clearOnDefault = true,
  } = options;
  const scopeKey = React.useCallback(
    (key: string) =>
      keyPrefix ? `${keyPrefix}${key.charAt(0).toUpperCase()}${key.slice(1)}` : key,
    [keyPrefix],
  );
  const searchUrlKey = scopeKey(searchKey);
  const pageUrlKey = scopeKey(pageKey);
  const perPageUrlKey = scopeKey(perPageKey);
  const sortApiKey = sorting?.sortKey ?? DEFAULT_SORT_KEY;
  const sortDirectionApiKey = sorting?.sortDirectionKey ?? DEFAULT_SORT_DIRECTION_KEY;
  const sortKey = scopeKey(sorting?.sortKey ?? DEFAULT_SORT_KEY);
  const sortDirectionKey = scopeKey(sorting?.sortDirectionKey ?? DEFAULT_SORT_DIRECTION_KEY);
  const defaultSortDirection = sorting?.defaultDirection ?? "asc";

  const queryStateOptions = { history, shallow, clearOnDefault };

  const [urlState, setQueryStates] = useQueryStates(
    {
      [searchUrlKey]: parseAsString.withDefault(""),
      ...(pagination
        ? {
            [pageUrlKey]: parseAsInteger.withDefault(1),
            [perPageUrlKey]: parseAsInteger.withDefault(defaultPerPage),
          }
        : {}),
      ...(sorting
        ? {
            [sortKey]: sorting.defaultField
              ? parseAsStringLiteral(sorting.fields).withDefault(sorting.defaultField)
              : parseAsStringLiteral(sorting.fields),
            [sortDirectionKey]: parseAsStringLiteral(["asc", "desc"] as const).withDefault(
              defaultSortDirection,
            ),
          }
        : {}),
    },
    queryStateOptions,
  );

  const urlSearch = urlState[searchUrlKey] as string;
  const page = pagination ? (urlState[pageUrlKey] as number) : 1;
  const perPage = pagination ? (urlState[perPageUrlKey] as number) : defaultPerPage;
  const sort = sorting ? ((urlState[sortKey] as TSort | null) ?? undefined) : undefined;
  const sortDirection = sorting
    ? (urlState[sortDirectionKey] as SortDirection)
    : defaultSortDirection;
  // Keep the search input responsive while debouncing the URL write.
  const [search, setSearchState] = React.useState(urlSearch);
  const normalizedSearch = React.useMemo(() => search.trim().toLowerCase(), [search]);

  React.useEffect(() => {
    setSearchState(urlSearch);
  }, [urlSearch]);

  const debouncedSetSearch = useDebouncedCallback(
    (value: string) => void setQueryStates({ [searchUrlKey]: value || null }),
    debounceMs,
  );

  const setSearch = React.useCallback(
    (value: string) => {
      setSearchState(value);
      debouncedSetSearch(value);
      if (pagination) {
        void setQueryStates({ [pageUrlKey]: null });
      }
    },
    [debouncedSetSearch, pageUrlKey, pagination, setQueryStates],
  );

  const clearSearch = React.useCallback(() => {
    debouncedSetSearch.cancel();
    setSearchState("");
    void setQueryStates({
      [searchUrlKey]: null,
      ...(pagination ? { [pageUrlKey]: null } : {}),
    });
  }, [debouncedSetSearch, pageUrlKey, pagination, searchUrlKey, setQueryStates]);

  const setPage = React.useCallback(
    (nextPage: number) => {
      void setQueryStates({ [pageUrlKey]: nextPage === 1 ? null : nextPage });
    },
    [pageUrlKey, setQueryStates],
  );

  const setPerPage = React.useCallback(
    (nextPerPage: number) => {
      void setQueryStates({
        [perPageUrlKey]: nextPerPage === defaultPerPage ? null : nextPerPage,
        [pageUrlKey]: null,
      });
    },
    [defaultPerPage, pageUrlKey, perPageUrlKey, setQueryStates],
  );

  const setSorting = React.useCallback(
    (field: TSort | undefined, direction = defaultSortDirection) => {
      if (!sorting) return;

      void setQueryStates({
        [sortKey]: field ?? null,
        [sortDirectionKey]: field ? direction : null,
        ...(pagination ? { [pageUrlKey]: null } : {}),
      });
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
  );

  const apiParams = React.useMemo(() => {
    const nextParams: Record<string, ApiParamValue> = {};
    const apiSearch = urlSearch.trim();

    if (apiSearch) {
      nextParams[searchKey] = apiSearch;
    }

    if (pagination) {
      nextParams[pageKey] = page;
      nextParams[perPageKey] = perPage;
    }

    if (sort) {
      nextParams[sortApiKey] = sort;
      nextParams[sortDirectionApiKey] = sortDirection;
    }

    return nextParams;
  }, [
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
  ]);

  return {
    search,
    normalizedSearch,
    setSearch,
    clearSearch,
    apiParams,
    page,
    setPage,
    perPage,
    setPerPage,
    sort,
    sortDirection,
    setSorting,
  };
}
