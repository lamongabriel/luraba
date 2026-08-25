"use client"

import { useQuery } from "@tanstack/react-query"
import type {
  ListIntegrationsHttpQuery,
  ListIntegrationsHttpResponse,
} from "@/interfaces/http/integrations-http"
import type { AppQueryOptions } from "@/queries/query-options"
import { listIntegrations } from "@/services/integrations.service"

export const integrationQueryKeys = {
  all: ["integrations"] as const,
  lists: () => [...integrationQueryKeys.all, "list"] as const,
  list: (query: ListIntegrationsHttpQuery = {}) =>
    [...integrationQueryKeys.lists(), query] as const,
}

export function useIntegrationsQuery<TData = ListIntegrationsHttpResponse>(
  query: ListIntegrationsHttpQuery = {},
  options?: AppQueryOptions<ListIntegrationsHttpResponse, TData>,
) {
  return useQuery({
    queryKey: integrationQueryKeys.list(query),
    queryFn: () => listIntegrations(query),
    ...options,
  })
}
