"use client"

import { useQuery } from "@tanstack/react-query"

import type {
  ListHouseholdInvitesHttpQuery,
  ListHouseholdInvitesHttpResponse,
  ListMyHouseholdInvitesHttpQuery,
  ListMyHouseholdInvitesHttpResponse,
  PreviewHouseholdInviteHttpResponse,
} from "@/interfaces/http/household-invites-http"
import type { AppQueryOptions } from "@/queries/query-options"
import {
  listHouseholdInvites,
  listMyHouseholdInvites,
  previewHouseholdInvite,
} from "@/services/households.service"

export const householdInviteQueryKeys = {
  all: ["household-invites"] as const,
  lists: () => [...householdInviteQueryKeys.all, "list"] as const,
  householdList: (
    householdId: string,
    query: ListHouseholdInvitesHttpQuery = {},
  ) =>
    [
      ...householdInviteQueryKeys.lists(),
      "household",
      householdId,
      query,
    ] as const,
  myList: (query: ListMyHouseholdInvitesHttpQuery = {}) =>
    [...householdInviteQueryKeys.lists(), "mine", query] as const,
  previews: () => [...householdInviteQueryKeys.all, "preview"] as const,
  preview: (token: string) =>
    [...householdInviteQueryKeys.previews(), token] as const,
}

export function useHouseholdInvitesQuery<
  TData = ListHouseholdInvitesHttpResponse,
>(
  householdId: string,
  query: ListHouseholdInvitesHttpQuery = {},
  options?: AppQueryOptions<ListHouseholdInvitesHttpResponse, TData>,
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
  TData = ListMyHouseholdInvitesHttpResponse,
>(
  query: ListMyHouseholdInvitesHttpQuery = {},
  options?: AppQueryOptions<ListMyHouseholdInvitesHttpResponse, TData>,
) {
  return useQuery({
    queryKey: householdInviteQueryKeys.myList(query),
    queryFn: () => listMyHouseholdInvites(query),
    placeholderData: (previousData) => previousData,
    ...options,
  })
}

export function useHouseholdInvitePreviewQuery<
  TData = PreviewHouseholdInviteHttpResponse,
>(
  token: string,
  options?: AppQueryOptions<PreviewHouseholdInviteHttpResponse, TData>,
) {
  return useQuery({
    queryKey: householdInviteQueryKeys.preview(token),
    queryFn: () => previewHouseholdInvite(token),
    staleTime: 0,
    ...options,
    enabled: Boolean(token) && (options?.enabled ?? true),
  })
}
