"use client"

import {
  type AcceptHouseholdInviteByIdResult,
  type AcceptHouseholdInviteInput,
  type AcceptHouseholdInviteResult,
  type CancelHouseholdInviteResult,
  type CreateHouseholdInput,
  type CreateHouseholdInviteInput,
  type CreateHouseholdInviteResult,
  type CreateHouseholdResult,
  type DeleteHouseholdResult,
  type GetHouseholdResult,
  householdsEndpoints,
  type ListHouseholdInviteStatusesResult,
  type ListHouseholdInvitesQuery,
  type ListHouseholdInvitesResult,
  type ListHouseholdMembersQuery,
  type ListHouseholdMembersResult,
  type ListHouseholdPermissionsResult,
  type ListHouseholdRolesResult,
  type ListHouseholdsQuery,
  type ListHouseholdsResult,
  type ListMyHouseholdInvitesQuery,
  type ListMyHouseholdInvitesResult,
  type PreviewHouseholdInviteQuery,
  type PreviewHouseholdInviteResult,
  type RefreshHouseholdInviteLinkResult,
  type RejectHouseholdInviteByIdResult,
  type RejectHouseholdInviteResult,
  type RemoveHouseholdMemberResult,
  type ResendHouseholdInviteResult,
  type UpdateHouseholdInput,
  type UpdateHouseholdMemberInput,
  type UpdateHouseholdMemberResult,
  type UpdateHouseholdResult,
} from "@luraba/contracts"
import type { AxiosInstance } from "axios"
import { lurabaApiPassiveClient } from "@/api/luraba-api"
import { requestContract } from "@/services/contract-client.service"

type HouseholdRequestOptions = { client?: AxiosInstance }

export function listHouseholds(
  query: ListHouseholdsQuery = {},
  options: HouseholdRequestOptions = {},
): Promise<ListHouseholdsResult> {
  return requestContract(householdsEndpoints.list, {
    query,
    client: options.client,
  })
}

export function createHousehold(
  input: CreateHouseholdInput,
): Promise<CreateHouseholdResult> {
  return requestContract(householdsEndpoints.create, { body: input })
}

export function listHouseholdRoles(): Promise<ListHouseholdRolesResult> {
  return requestContract(householdsEndpoints.roles)
}

export function listHouseholdPermissions(): Promise<ListHouseholdPermissionsResult> {
  return requestContract(householdsEndpoints.permissions)
}

export function listHouseholdInviteStatuses(): Promise<ListHouseholdInviteStatusesResult> {
  return requestContract(householdsEndpoints.inviteStatuses)
}

export function getHousehold(id: string): Promise<GetHouseholdResult> {
  return requestContract(householdsEndpoints.get, { params: { id } })
}

export function deleteHousehold(id: string): Promise<DeleteHouseholdResult> {
  return requestContract(householdsEndpoints.delete, { params: { id } })
}

export function updateHousehold(
  id: string,
  input: UpdateHouseholdInput,
): Promise<UpdateHouseholdResult> {
  return requestContract(householdsEndpoints.update, {
    params: { id },
    body: input,
  })
}

export function listHouseholdMembers(
  id: string,
  query: ListHouseholdMembersQuery = {},
): Promise<ListHouseholdMembersResult> {
  return requestContract(householdsEndpoints.members, {
    params: { id },
    query,
  })
}

export function updateHouseholdMember(
  id: string,
  userId: string,
  input: UpdateHouseholdMemberInput,
): Promise<UpdateHouseholdMemberResult> {
  return requestContract(householdsEndpoints.updateMember, {
    params: { id, userId },
    body: input,
  })
}

export function removeHouseholdMember(
  id: string,
  userId: string,
): Promise<RemoveHouseholdMemberResult> {
  return requestContract(householdsEndpoints.removeMember, {
    params: { id, userId },
  })
}

export function listHouseholdInvites(
  id: string,
  query: ListHouseholdInvitesQuery = {},
): Promise<ListHouseholdInvitesResult> {
  return requestContract(householdsEndpoints.invites, {
    params: { id },
    query,
  })
}

export function listMyHouseholdInvites(
  query: ListMyHouseholdInvitesQuery = {},
): Promise<ListMyHouseholdInvitesResult> {
  return requestContract(householdsEndpoints.myInvites, { query })
}

export function createHouseholdInvite(
  id: string,
  input: CreateHouseholdInviteInput,
): Promise<CreateHouseholdInviteResult> {
  return requestContract(householdsEndpoints.createInvite, {
    params: { id },
    body: input,
  })
}

export function previewHouseholdInvite(
  query: PreviewHouseholdInviteQuery,
): Promise<PreviewHouseholdInviteResult> {
  return requestContract(householdsEndpoints.previewInvite, {
    query,
    client: lurabaApiPassiveClient,
  })
}

export function acceptHouseholdInvite(
  input: AcceptHouseholdInviteInput,
): Promise<AcceptHouseholdInviteResult> {
  return requestContract(householdsEndpoints.acceptInvite, { body: input })
}

export function rejectHouseholdInvite(
  input: AcceptHouseholdInviteInput,
): Promise<RejectHouseholdInviteResult> {
  return requestContract(householdsEndpoints.rejectInvite, { body: input })
}

export function acceptHouseholdInviteById(
  inviteId: string,
): Promise<AcceptHouseholdInviteByIdResult> {
  return requestContract(householdsEndpoints.acceptInviteById, {
    params: { inviteId },
  })
}

export function rejectHouseholdInviteById(
  inviteId: string,
): Promise<RejectHouseholdInviteByIdResult> {
  return requestContract(householdsEndpoints.rejectInviteById, {
    params: { inviteId },
  })
}

export function refreshHouseholdInviteLink(
  id: string,
  inviteId: string,
): Promise<RefreshHouseholdInviteLinkResult> {
  return requestContract(householdsEndpoints.refreshInviteLink, {
    params: { id, inviteId },
  })
}

export function resendHouseholdInvite(
  id: string,
  inviteId: string,
): Promise<ResendHouseholdInviteResult> {
  return requestContract(householdsEndpoints.resendInvite, {
    params: { id, inviteId },
  })
}

export function cancelHouseholdInvite(
  id: string,
  inviteId: string,
): Promise<CancelHouseholdInviteResult> {
  return requestContract(householdsEndpoints.cancelInvite, {
    params: { id, inviteId },
  })
}
