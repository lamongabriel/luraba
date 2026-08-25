"use client"

import { useQuery } from "@tanstack/react-query"

import type {
  ListCategoriesHttpQuery,
  ListCategoriesHttpResponse,
} from "@/interfaces/http/categories-http"
import type { AppQueryOptions } from "@/queries/query-options"
import { listCategories } from "@/services/categories.service"

export const categoryQueryKeys = {
  all: ["categories"] as const,
  lists: () => [...categoryQueryKeys.all, "list"] as const,
  list: (query: ListCategoriesHttpQuery = {}) =>
    [...categoryQueryKeys.lists(), query] as const,
}

export function useCategoriesQuery<TData = ListCategoriesHttpResponse>(
  query: ListCategoriesHttpQuery = {},
  options?: AppQueryOptions<ListCategoriesHttpResponse, TData>,
) {
  return useQuery({
    queryKey: categoryQueryKeys.list(query),
    queryFn: () => listCategories(query),
    ...options,
  })
}
