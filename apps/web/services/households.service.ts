"use client"

import { lurabaApiPassiveClient } from "@/api/luraba-api"
import type { HouseholdSummary } from "@/interfaces/household"
import type {
  AcceptHouseholdInviteHttpResponse,
  CreateHouseholdInviteHttpBody,
  CreateHouseholdInviteHttpResponse,
  ListHouseholdInvitesHttpQuery,
  ListHouseholdInvitesHttpResponse,
  ListMyHouseholdInvitesHttpQuery,
  ListMyHouseholdInvitesHttpResponse,
  PreviewHouseholdInviteHttpResponse,
  RefreshHouseholdInviteLinkHttpResponse,
} from "@/interfaces/http/household-invites-http"
import type {
  CreateHouseholdHttpBody,
  CreateHouseholdHttpResponse,
  ListHouseholdInviteStatusesHttpResponse,
  ListHouseholdMembersHttpQuery,
  ListHouseholdMembersHttpResponse,
  ListHouseholdPermissionsHttpResponse,
  ListHouseholdRolesHttpResponse,
  ListHouseholdsHttpQuery,
  ListHouseholdsHttpResponse,
  UpdateHouseholdHttpBody,
  UpdateHouseholdHttpResponse,
  UpdateHouseholdMemberHttpBody,
  UpdateHouseholdMemberHttpResponse,
} from "@/interfaces/http/households-http"
import {
  deleteApiResource,
  getApiData,
  getApiList,
  patchApiData,
  postApiData,
  postApiResource,
} from "@/services/api-client.service"
import { serializeHttpQuery } from "@/services/http-query"

export function listHouseholds(
  query: ListHouseholdsHttpQuery = {},
): Promise<ListHouseholdsHttpResponse> {
  return getApiList("/households", { params: serializeHttpQuery(query) })
}

export function probeHouseholds(
  query: ListHouseholdsHttpQuery = {},
): Promise<ListHouseholdsHttpResponse> {
  return getApiList(
    "/households",
    { params: serializeHttpQuery(query) },
    lurabaApiPassiveClient,
  )
}

export function createHousehold(
  body: CreateHouseholdHttpBody,
): Promise<CreateHouseholdHttpResponse> {
  return postApiData("/households", body)
}

export function listHouseholdRoles(): Promise<ListHouseholdRolesHttpResponse> {
  return getApiData("/households/roles")
}

export function listHouseholdPermissions(): Promise<ListHouseholdPermissionsHttpResponse> {
  return getApiData("/households/permissions")
}

export function listHouseholdInviteStatuses(): Promise<ListHouseholdInviteStatusesHttpResponse> {
  return getApiData("/households/invite-statuses")
}

export function getHousehold(householdId: string): Promise<HouseholdSummary> {
  return getApiData(`/households/${householdId}`)
}

export function deleteHousehold(householdId: string): Promise<void> {
  return deleteApiResource(`/households/${householdId}`)
}

export function updateHousehold({
  householdId,
  body,
}: {
  householdId: string
  body: UpdateHouseholdHttpBody
}): Promise<UpdateHouseholdHttpResponse> {
  return patchApiData(`/households/${householdId}`, body)
}

export function listHouseholdMembers(
  householdId: string,
  query: ListHouseholdMembersHttpQuery = {},
): Promise<ListHouseholdMembersHttpResponse> {
  return getApiList(`/households/${householdId}/members`, {
    params: serializeHttpQuery(query),
  })
}

export function updateHouseholdMember({
  householdId,
  userId,
  body,
}: {
  householdId: string
  userId: string
  body: UpdateHouseholdMemberHttpBody
}): Promise<UpdateHouseholdMemberHttpResponse> {
  return patchApiData(`/households/${householdId}/members/${userId}`, body)
}

export function removeHouseholdMember({
  householdId,
  userId,
}: {
  householdId: string
  userId: string
}): Promise<void> {
  return deleteApiResource(`/households/${householdId}/members/${userId}`)
}

export function listHouseholdInvites(
  householdId: string,
  query: ListHouseholdInvitesHttpQuery = {},
): Promise<ListHouseholdInvitesHttpResponse> {
  return getApiList(`/households/${householdId}/invites`, {
    params: serializeHttpQuery(query),
  })
}

export function listMyHouseholdInvites(
  query: ListMyHouseholdInvitesHttpQuery = {},
): Promise<ListMyHouseholdInvitesHttpResponse> {
  return getApiList("/households/invites", {
    params: serializeHttpQuery(query),
  })
}

export function createHouseholdInvite({
  householdId,
  body,
}: {
  householdId: string
  body: CreateHouseholdInviteHttpBody
}): Promise<CreateHouseholdInviteHttpResponse> {
  return postApiData(`/households/${householdId}/invites`, body)
}

export function previewHouseholdInvite(
  token: string,
): Promise<PreviewHouseholdInviteHttpResponse> {
  return getApiData(
    "/households/invites/preview",
    { params: { token } },
    lurabaApiPassiveClient,
  )
}

export function acceptHouseholdInvite(
  token: string,
): Promise<AcceptHouseholdInviteHttpResponse> {
  return postApiData("/households/invites/accept", { token })
}

export function rejectHouseholdInvite(token: string): Promise<void> {
  return postApiResource("/households/invites/reject", { token })
}

export function acceptHouseholdInviteById(
  inviteId: string,
): Promise<AcceptHouseholdInviteHttpResponse> {
  return postApiData(`/households/invites/${inviteId}/accept`)
}

export function rejectHouseholdInviteById(inviteId: string): Promise<void> {
  return postApiResource(`/households/invites/${inviteId}/reject`)
}

export function refreshHouseholdInviteLink({
  householdId,
  inviteId,
}: {
  householdId: string
  inviteId: string
}): Promise<RefreshHouseholdInviteLinkHttpResponse> {
  return postApiData(`/households/${householdId}/invites/${inviteId}/link`)
}

export function resendHouseholdInvite({
  householdId,
  inviteId,
}: {
  householdId: string
  inviteId: string
}): Promise<void> {
  return postApiResource(
    `/households/${householdId}/invites/${inviteId}/resend`,
  )
}

export function cancelHouseholdInvite({
  householdId,
  inviteId,
}: {
  householdId: string
  inviteId: string
}): Promise<void> {
  return deleteApiResource(`/households/${householdId}/invites/${inviteId}`)
}
