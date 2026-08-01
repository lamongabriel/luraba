"use client"

import { useQuery } from "@tanstack/react-query"

import type {
  ListTagsHttpQuery,
  ListTagsHttpResponse,
} from "@/interfaces/http/tags-http"
import type { AppQueryOptions } from "@/queries/query-options"
import { listTags } from "@/services/tags.service"

export const tagQueryKeys = {
  all: ["tags"] as const,
  lists: () => [...tagQueryKeys.all, "list"] as const,
  list: (query: ListTagsHttpQuery = {}) =>
    [...tagQueryKeys.lists(), query] as const,
}

export function useTagsQuery<TData = ListTagsHttpResponse>(
  query: ListTagsHttpQuery = {},
  options?: AppQueryOptions<ListTagsHttpResponse, TData>,
) {
  return useQuery({
    queryKey: tagQueryKeys.list(query),
    queryFn: () => listTags(query),
    ...options,
  })
}
