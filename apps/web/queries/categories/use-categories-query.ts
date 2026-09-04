"use client"

import { useQuery } from "@tanstack/react-query"

import type { AppQueryOptions } from "@/queries/query-options"
import { listCategories } from "@/services/categories.service"

type ListCategoriesQuery = NonNullable<Parameters<typeof listCategories>[0]>
type ListCategoriesResponse = Awaited<ReturnType<typeof listCategories>>

export const categoryQueryKeys = {
  all: ["categories"] as const,
  lists: () => [...categoryQueryKeys.all, "list"] as const,
  list: (query: ListCategoriesQuery = {}) =>
    [...categoryQueryKeys.lists(), query] as const,
}

export function useCategoriesQuery<TData = ListCategoriesResponse>(
  query: ListCategoriesQuery = {},
  options?: AppQueryOptions<ListCategoriesResponse, TData>,
) {
  return useQuery({
    queryKey: categoryQueryKeys.list(query),
    queryFn: () => listCategories(query),
    ...options,
  })
}
