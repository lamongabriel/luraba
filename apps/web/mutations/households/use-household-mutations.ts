"use client"

import type {
  AcceptHouseholdInviteByIdResult,
  AcceptHouseholdInviteInput,
  AcceptHouseholdInviteResult,
  CancelHouseholdInviteResult,
  CreateHouseholdInput,
  CreateHouseholdInviteInput,
  CreateHouseholdInviteResult,
  CreateHouseholdResult,
  DeleteHouseholdResult,
  RefreshHouseholdInviteLinkResult,
  RejectHouseholdInviteByIdResult,
  RejectHouseholdInviteResult,
  RemoveHouseholdMemberResult,
  ResendHouseholdInviteResult,
  UpdateHouseholdInput,
  UpdateHouseholdMemberInput,
  UpdateHouseholdMemberResult,
  UpdateHouseholdResult,
} from "@luraba/contracts"
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation"
import {
  acceptHouseholdInvite,
  acceptHouseholdInviteById,
  cancelHouseholdInvite,
  createHousehold,
  createHouseholdInvite,
  deleteHousehold,
  refreshHouseholdInviteLink,
  rejectHouseholdInvite,
  rejectHouseholdInviteById,
  removeHouseholdMember,
  resendHouseholdInvite,
  updateHousehold,
  updateHouseholdMember,
} from "@/services/households.service"

export const createHouseholdMutationDefinition = createAppMutationDefinition<
  CreateHouseholdResult,
  CreateHouseholdInput
>({
  defaultErrorMessage: "We couldn't create this household. Please try again.",
  mutationFn: createHousehold,
  mutationKey: ["households", "create"],
})

export function useCreateHouseholdMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateHouseholdResult,
    CreateHouseholdInput,
    TContext
  >,
) {
  return useAppMutation(createHouseholdMutationDefinition, options)
}

export const deleteHouseholdMutationDefinition = createAppMutationDefinition<
  DeleteHouseholdResult,
  string
>({
  defaultErrorMessage: "We couldn't delete this household. Please try again.",
  mutationFn: deleteHousehold,
  mutationKey: ["households", "delete"],
})

export function useDeleteHouseholdMutation<TContext = unknown>(
  options?: UseAppMutationOptions<DeleteHouseholdResult, string, TContext>,
) {
  return useAppMutation(deleteHouseholdMutationDefinition, options)
}

type UpdateHouseholdVariables = {
  householdId: string
  body: UpdateHouseholdInput
}
export const updateHouseholdMutationDefinition = createAppMutationDefinition<
  UpdateHouseholdResult,
  UpdateHouseholdVariables
>({
  defaultErrorMessage: "We couldn't update this household. Please try again.",
  mutationFn: ({ householdId, body }) => updateHousehold(householdId, body),
  mutationKey: ["households", "update"],
})

export function useUpdateHouseholdMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateHouseholdResult,
    UpdateHouseholdVariables,
    TContext
  >,
) {
  return useAppMutation(updateHouseholdMutationDefinition, options)
}

type UpdateMemberVariables = {
  householdId: string
  userId: string
  body: UpdateHouseholdMemberInput
}
export const updateHouseholdMemberMutationDefinition =
  createAppMutationDefinition<
    UpdateHouseholdMemberResult,
    UpdateMemberVariables
  >({
    defaultErrorMessage:
      "We couldn't update this household member. Please try again.",
    mutationFn: ({ householdId, userId, body }) =>
      updateHouseholdMember(householdId, userId, body),
    mutationKey: ["households", "members", "update"],
  })

export function useUpdateHouseholdMemberMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateHouseholdMemberResult,
    UpdateMemberVariables,
    TContext
  >,
) {
  return useAppMutation(updateHouseholdMemberMutationDefinition, options)
}

type HouseholdMemberVariables = { householdId: string; userId: string }
export const removeHouseholdMemberMutationDefinition =
  createAppMutationDefinition<
    RemoveHouseholdMemberResult,
    HouseholdMemberVariables
  >({
    defaultErrorMessage:
      "We couldn't remove this household member. Please try again.",
    mutationFn: ({ householdId, userId }) =>
      removeHouseholdMember(householdId, userId),
    mutationKey: ["households", "members", "remove"],
  })

export function useRemoveHouseholdMemberMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    RemoveHouseholdMemberResult,
    HouseholdMemberVariables,
    TContext
  >,
) {
  return useAppMutation(removeHouseholdMemberMutationDefinition, options)
}

type CreateInviteVariables = {
  householdId: string
  body: CreateHouseholdInviteInput
}
export const createHouseholdInviteMutationDefinition =
  createAppMutationDefinition<
    CreateHouseholdInviteResult,
    CreateInviteVariables
  >({
    defaultErrorMessage:
      "We couldn't create this invitation. Please try again.",
    mutationFn: ({ householdId, body }) =>
      createHouseholdInvite(householdId, body),
    mutationKey: ["households", "invites", "create"],
  })

export function useCreateHouseholdInviteMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateHouseholdInviteResult,
    CreateInviteVariables,
    TContext
  >,
) {
  return useAppMutation(createHouseholdInviteMutationDefinition, options)
}

type InviteVariables = { householdId: string; inviteId: string }
export const refreshHouseholdInviteLinkMutationDefinition =
  createAppMutationDefinition<
    RefreshHouseholdInviteLinkResult,
    InviteVariables
  >({
    defaultErrorMessage:
      "We couldn't refresh this invitation link. Please try again.",
    mutationFn: ({ householdId, inviteId }) =>
      refreshHouseholdInviteLink(householdId, inviteId),
    mutationKey: ["households", "invites", "refresh-link"],
  })

export function useRefreshHouseholdInviteLinkMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    RefreshHouseholdInviteLinkResult,
    InviteVariables,
    TContext
  >,
) {
  return useAppMutation(refreshHouseholdInviteLinkMutationDefinition, options)
}

export const resendHouseholdInviteMutationDefinition =
  createAppMutationDefinition<ResendHouseholdInviteResult, InviteVariables>({
    defaultErrorMessage:
      "We couldn't resend this invitation. Please try again.",
    mutationFn: ({ householdId, inviteId }) =>
      resendHouseholdInvite(householdId, inviteId),
    mutationKey: ["households", "invites", "resend"],
  })

export function useResendHouseholdInviteMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    ResendHouseholdInviteResult,
    InviteVariables,
    TContext
  >,
) {
  return useAppMutation(resendHouseholdInviteMutationDefinition, options)
}

export const cancelHouseholdInviteMutationDefinition =
  createAppMutationDefinition<CancelHouseholdInviteResult, InviteVariables>({
    defaultErrorMessage:
      "We couldn't cancel this invitation. Please try again.",
    mutationFn: ({ householdId, inviteId }) =>
      cancelHouseholdInvite(householdId, inviteId),
    mutationKey: ["households", "invites", "cancel"],
  })

export function useCancelHouseholdInviteMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CancelHouseholdInviteResult,
    InviteVariables,
    TContext
  >,
) {
  return useAppMutation(cancelHouseholdInviteMutationDefinition, options)
}

type InviteTokenVariables = AcceptHouseholdInviteInput
export const acceptHouseholdInviteMutationDefinition =
  createAppMutationDefinition<
    AcceptHouseholdInviteResult,
    InviteTokenVariables
  >({
    defaultErrorMessage:
      "We couldn't accept this invitation. Please try again.",
    mutationFn: ({ token }) =>
      acceptHouseholdInvite({ token } satisfies AcceptHouseholdInviteInput),
    mutationKey: ["households", "invites", "accept"],
  })

export function useAcceptHouseholdInviteMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    AcceptHouseholdInviteResult,
    InviteTokenVariables,
    TContext
  >,
) {
  return useAppMutation(acceptHouseholdInviteMutationDefinition, options)
}

export const acceptHouseholdInviteByIdMutationDefinition =
  createAppMutationDefinition<AcceptHouseholdInviteByIdResult, string>({
    defaultErrorMessage:
      "We couldn't accept this invitation. Please try again.",
    mutationFn: acceptHouseholdInviteById,
    mutationKey: ["households", "invites", "accept-by-id"],
  })

export function useAcceptHouseholdInviteByIdMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    AcceptHouseholdInviteByIdResult,
    string,
    TContext
  >,
) {
  return useAppMutation(acceptHouseholdInviteByIdMutationDefinition, options)
}

export const rejectHouseholdInviteByIdMutationDefinition =
  createAppMutationDefinition<RejectHouseholdInviteByIdResult, string>({
    defaultErrorMessage:
      "We couldn't decline this invitation. Please try again.",
    mutationFn: rejectHouseholdInviteById,
    mutationKey: ["households", "invites", "reject-by-id"],
  })

export function useRejectHouseholdInviteByIdMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    RejectHouseholdInviteByIdResult,
    string,
    TContext
  >,
) {
  return useAppMutation(rejectHouseholdInviteByIdMutationDefinition, options)
}

export const rejectHouseholdInviteMutationDefinition =
  createAppMutationDefinition<
    RejectHouseholdInviteResult,
    InviteTokenVariables
  >({
    defaultErrorMessage:
      "We couldn't reject this invitation. Please try again.",
    mutationFn: ({ token }) =>
      rejectHouseholdInvite({ token } satisfies AcceptHouseholdInviteInput),
    mutationKey: ["households", "invites", "reject"],
  })

export function useRejectHouseholdInviteMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    RejectHouseholdInviteResult,
    InviteTokenVariables,
    TContext
  >,
) {
  return useAppMutation(rejectHouseholdInviteMutationDefinition, options)
}
