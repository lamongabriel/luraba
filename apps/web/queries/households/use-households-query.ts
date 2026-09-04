"use client"

import type {
  HouseholdSummary,
  ListHouseholdInviteStatusesResult,
  ListHouseholdMembersQuery,
  ListHouseholdMembersResult,
  ListHouseholdPermissionsResult,
  ListHouseholdRolesResult,
  ListHouseholdsQuery,
  ListHouseholdsResult,
} from "@luraba/contracts"
import { useQuery } from "@tanstack/react-query"
import { lurabaApiPassiveClient } from "@/api/luraba-api"
import type { AppQueryOptions } from "@/queries/query-options"
import {
  getHousehold,
  listHouseholdInviteStatuses,
  listHouseholdMembers,
  listHouseholdPermissions,
  listHouseholdRoles,
  listHouseholds,
} from "@/services/households.service"

export const householdQueryKeys = {
  all: ["households"] as const,
  lists: () => [...householdQueryKeys.all, "list"] as const,
  list: (query: ListHouseholdsQuery = {}) =>
    [...householdQueryKeys.lists(), query] as const,
  detail: (householdId: string) =>
    [...householdQueryKeys.all, "detail", householdId] as const,
  probe: (query: ListHouseholdsQuery = {}) =>
    [...householdQueryKeys.list(query), "probe"] as const,
  members: (householdId: string, query: ListHouseholdMembersQuery = {}) =>
    [...householdQueryKeys.all, householdId, "members", query] as const,
  roles: () => [...householdQueryKeys.all, "roles"] as const,
  permissions: () => [...householdQueryKeys.all, "permissions"] as const,
  inviteStatuses: () => [...householdQueryKeys.all, "invite-statuses"] as const,
}

export function useHouseholdsQuery<TData = ListHouseholdsResult>(
  query: ListHouseholdsQuery = {},
  options?: AppQueryOptions<ListHouseholdsResult, TData>,
) {
  return useQuery({
    queryKey: householdQueryKeys.list(query),
    queryFn: () => listHouseholds(query),
    ...options,
  })
}

export function useHouseholdRolesQuery<TData = ListHouseholdRolesResult>(
  options?: AppQueryOptions<ListHouseholdRolesResult, TData>,
) {
  return useQuery({
    queryKey: householdQueryKeys.roles(),
    queryFn: listHouseholdRoles,
    staleTime: Number.POSITIVE_INFINITY,
    ...options,
  })
}

export function useHouseholdPermissionsQuery<
  TData = ListHouseholdPermissionsResult,
>(options?: AppQueryOptions<ListHouseholdPermissionsResult, TData>) {
  return useQuery({
    queryKey: householdQueryKeys.permissions(),
    queryFn: listHouseholdPermissions,
    staleTime: Number.POSITIVE_INFINITY,
    ...options,
  })
}

export function useHouseholdInviteStatusesQuery<
  TData = ListHouseholdInviteStatusesResult,
>(options?: AppQueryOptions<ListHouseholdInviteStatusesResult, TData>) {
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

export function useProbeHouseholdsQuery<TData = ListHouseholdsResult>(
  query: ListHouseholdsQuery = {},
  options?: AppQueryOptions<ListHouseholdsResult, TData>,
) {
  return useQuery({
    queryKey: householdQueryKeys.probe(query),
    queryFn: () => listHouseholds(query, { client: lurabaApiPassiveClient }),
    ...options,
  })
}

export function useHouseholdMembersQuery<TData = ListHouseholdMembersResult>(
  householdId: string,
  query: ListHouseholdMembersQuery = {},
  options?: AppQueryOptions<ListHouseholdMembersResult, TData>,
) {
  return useQuery({
    queryKey: householdQueryKeys.members(householdId, query),
    queryFn: () => listHouseholdMembers(householdId, query),
    placeholderData: (previousData) => previousData,
    ...options,
    enabled: Boolean(householdId) && (options?.enabled ?? true),
  })
}
