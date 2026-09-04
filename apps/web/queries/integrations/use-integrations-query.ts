"use client"

import { useQuery } from "@tanstack/react-query"
import type { AppQueryOptions } from "@/queries/query-options"
import { listIntegrations } from "@/services/integrations.service"

type ListIntegrationsQuery = NonNullable<Parameters<typeof listIntegrations>[0]>
type ListIntegrationsResponse = Awaited<ReturnType<typeof listIntegrations>>

export const integrationQueryKeys = {
  all: ["integrations"] as const,
  lists: () => [...integrationQueryKeys.all, "list"] as const,
  list: (query: ListIntegrationsQuery = {}) =>
    [...integrationQueryKeys.lists(), query] as const,
}

export function useIntegrationsQuery<TData = ListIntegrationsResponse>(
  query: ListIntegrationsQuery = {},
  options?: AppQueryOptions<ListIntegrationsResponse, TData>,
) {
  return useQuery({
    queryKey: integrationQueryKeys.list(query),
    queryFn: () => listIntegrations(query),
    ...options,
  })
}
