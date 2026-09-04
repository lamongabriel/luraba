"use client"

import { useQuery } from "@tanstack/react-query"

import type { AppQueryOptions } from "@/queries/query-options"
import { listTags } from "@/services/tags.service"

type ListTagsQuery = NonNullable<Parameters<typeof listTags>[0]>
type ListTagsResponse = Awaited<ReturnType<typeof listTags>>

export const tagQueryKeys = {
  all: ["tags"] as const,
  lists: () => [...tagQueryKeys.all, "list"] as const,
  list: (query: ListTagsQuery = {}) =>
    [...tagQueryKeys.lists(), query] as const,
}

export function useTagsQuery<TData = ListTagsResponse>(
  query: ListTagsQuery = {},
  options?: AppQueryOptions<ListTagsResponse, TData>,
) {
  return useQuery({
    queryKey: tagQueryKeys.list(query),
    queryFn: () => listTags(query),
    ...options,
  })
}
