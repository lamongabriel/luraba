"use client"

import type {
  ListHouseholdInvitesQuery,
  ListHouseholdInvitesResult,
  ListMyHouseholdInvitesQuery,
  ListMyHouseholdInvitesResult,
  PreviewHouseholdInviteResult,
} from "@luraba/contracts"
import { useQuery } from "@tanstack/react-query"
import type { AppQueryOptions } from "@/queries/query-options"
import {
  listHouseholdInvites,
  listMyHouseholdInvites,
  previewHouseholdInvite,
} from "@/services/households.service"

export const householdInviteQueryKeys = {
  all: ["household-invites"] as const,
  lists: () => [...householdInviteQueryKeys.all, "list"] as const,
  householdList: (householdId: string, query: ListHouseholdInvitesQuery = {}) =>
    [
      ...householdInviteQueryKeys.lists(),
      "household",
      householdId,
      query,
    ] as const,
  myList: (query: ListMyHouseholdInvitesQuery = {}) =>
    [...householdInviteQueryKeys.lists(), "mine", query] as const,
  previews: () => [...householdInviteQueryKeys.all, "preview"] as const,
  preview: (token: string) =>
    [...householdInviteQueryKeys.previews(), token] as const,
}

export function useHouseholdInvitesQuery<TData = ListHouseholdInvitesResult>(
  householdId: string,
  query: ListHouseholdInvitesQuery = {},
  options?: AppQueryOptions<ListHouseholdInvitesResult, TData>,
) {
  return useQuery({
    queryKey: householdInviteQueryKeys.householdList(householdId, query),
    queryFn: () => listHouseholdInvites(householdId, query),
    placeholderData: (previousData) => previousData,
    ...options,
    enabled: Boolean(householdId) && (options?.enabled ?? true),
  })
}

export function useMyHouseholdInvitesQuery<
  TData = ListMyHouseholdInvitesResult,
>(
  query: ListMyHouseholdInvitesQuery = {},
  options?: AppQueryOptions<ListMyHouseholdInvitesResult, TData>,
) {
  return useQuery({
    queryKey: householdInviteQueryKeys.myList(query),
    queryFn: () => listMyHouseholdInvites(query),
    placeholderData: (previousData) => previousData,
    ...options,
  })
}

export function useHouseholdInvitePreviewQuery<
  TData = PreviewHouseholdInviteResult,
>(
  token: string,
  options?: AppQueryOptions<PreviewHouseholdInviteResult, TData>,
) {
  return useQuery({
    queryKey: householdInviteQueryKeys.preview(token),
    queryFn: () => previewHouseholdInvite({ token }),
    staleTime: 0,
    ...options,
    enabled: Boolean(token) && (options?.enabled ?? true),
  })
}
