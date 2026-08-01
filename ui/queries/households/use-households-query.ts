"use client"

import { useQuery } from "@tanstack/react-query"

import type {
  ListHouseholdMembersHttpQuery,
  ListHouseholdMembersHttpResponse,
  ListHouseholdsHttpQuery,
  ListHouseholdsHttpResponse,
} from "@/interfaces/http/households-http"
import type { AppQueryOptions } from "@/queries/query-options"
import {
  listHouseholdMembers,
  listHouseholds,
  probeHouseholds,
} from "@/services/households.service"

export const householdQueryKeys = {
  all: ["households"] as const,
  lists: () => [...householdQueryKeys.all, "list"] as const,
  list: (query: ListHouseholdsHttpQuery = {}) =>
    [...householdQueryKeys.lists(), query] as const,
  probe: (query: ListHouseholdsHttpQuery = {}) =>
    [...householdQueryKeys.list(query), "probe"] as const,
  members: (householdId: string, query: ListHouseholdMembersHttpQuery = {}) =>
    [...householdQueryKeys.all, householdId, "members", query] as const,
}

export function useHouseholdsQuery<TData = ListHouseholdsHttpResponse>(
  query: ListHouseholdsHttpQuery = {},
  options?: AppQueryOptions<ListHouseholdsHttpResponse, TData>,
) {
  return useQuery({
    queryKey: householdQueryKeys.list(query),
    queryFn: () => listHouseholds(query),
    ...options,
  })
}

export function useProbeHouseholdsQuery<TData = ListHouseholdsHttpResponse>(
  query: ListHouseholdsHttpQuery = {},
  options?: AppQueryOptions<ListHouseholdsHttpResponse, TData>,
) {
  return useQuery({
    queryKey: householdQueryKeys.probe(query),
    queryFn: () => probeHouseholds(query),
    ...options,
  })
}

export function useHouseholdMembersQuery<
  TData = ListHouseholdMembersHttpResponse,
>(
  householdId: string,
  query: ListHouseholdMembersHttpQuery = {},
  options?: AppQueryOptions<ListHouseholdMembersHttpResponse, TData>,
) {
  return useQuery({
    queryKey: householdQueryKeys.members(householdId, query),
    queryFn: () => listHouseholdMembers(householdId, query),
    placeholderData: (previousData) => previousData,
    ...options,
    enabled: Boolean(householdId) && (options?.enabled ?? true),
  })
}
