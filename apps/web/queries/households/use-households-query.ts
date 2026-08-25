"use client"

import { useQuery } from "@tanstack/react-query"
import type { HouseholdSummary } from "@/interfaces/household"
import type {
  ListHouseholdInviteStatusesHttpResponse,
  ListHouseholdMembersHttpQuery,
  ListHouseholdMembersHttpResponse,
  ListHouseholdPermissionsHttpResponse,
  ListHouseholdRolesHttpResponse,
  ListHouseholdsHttpQuery,
  ListHouseholdsHttpResponse,
} from "@/interfaces/http/households-http"
import type { AppQueryOptions } from "@/queries/query-options"
import {
  getHousehold,
  listHouseholdInviteStatuses,
  listHouseholdMembers,
  listHouseholdPermissions,
  listHouseholdRoles,
  listHouseholds,
  probeHouseholds,
} from "@/services/households.service"

export const householdQueryKeys = {
  all: ["households"] as const,
  lists: () => [...householdQueryKeys.all, "list"] as const,
  list: (query: ListHouseholdsHttpQuery = {}) =>
    [...householdQueryKeys.lists(), query] as const,
  detail: (householdId: string) =>
    [...householdQueryKeys.all, "detail", householdId] as const,
  probe: (query: ListHouseholdsHttpQuery = {}) =>
    [...householdQueryKeys.list(query), "probe"] as const,
  members: (householdId: string, query: ListHouseholdMembersHttpQuery = {}) =>
    [...householdQueryKeys.all, householdId, "members", query] as const,
  roles: () => [...householdQueryKeys.all, "roles"] as const,
  permissions: () => [...householdQueryKeys.all, "permissions"] as const,
  inviteStatuses: () => [...householdQueryKeys.all, "invite-statuses"] as const,
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

export function useHouseholdRolesQuery<TData = ListHouseholdRolesHttpResponse>(
  options?: AppQueryOptions<ListHouseholdRolesHttpResponse, TData>,
) {
  return useQuery({
    queryKey: householdQueryKeys.roles(),
    queryFn: listHouseholdRoles,
    staleTime: Number.POSITIVE_INFINITY,
    ...options,
  })
}

export function useHouseholdPermissionsQuery<
  TData = ListHouseholdPermissionsHttpResponse,
>(options?: AppQueryOptions<ListHouseholdPermissionsHttpResponse, TData>) {
  return useQuery({
    queryKey: householdQueryKeys.permissions(),
    queryFn: listHouseholdPermissions,
    staleTime: Number.POSITIVE_INFINITY,
    ...options,
  })
}

export function useHouseholdInviteStatusesQuery<
  TData = ListHouseholdInviteStatusesHttpResponse,
>(options?: AppQueryOptions<ListHouseholdInviteStatusesHttpResponse, TData>) {
  return useQuery({
    queryKey: householdQueryKeys.inviteStatuses(),
    queryFn: listHouseholdInviteStatuses,
    staleTime: Number.POSITIVE_INFINITY,
    ...options,
  })
}

export function useHouseholdQuery<TData = HouseholdSummary>(
  householdId: string,
  options?: AppQueryOptions<HouseholdSummary, TData>,
) {
  return useQuery({
    queryKey: householdQueryKeys.detail(householdId),
    queryFn: () => getHousehold(householdId),
    ...options,
    enabled: Boolean(householdId) && (options?.enabled ?? true),
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
