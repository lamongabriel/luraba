"use client"

import type {
  AcceptHouseholdInviteHttpResponse,
  CreateHouseholdInviteHttpBody,
  CreateHouseholdInviteHttpResponse,
  RefreshHouseholdInviteLinkHttpResponse,
} from "@/interfaces/http/household-invites-http"
import type {
  CreateHouseholdHttpBody,
  CreateHouseholdHttpResponse,
  UpdateHouseholdHttpBody,
  UpdateHouseholdHttpResponse,
  UpdateHouseholdMemberHttpBody,
  UpdateHouseholdMemberHttpResponse,
} from "@/interfaces/http/households-http"
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
  CreateHouseholdHttpResponse,
  CreateHouseholdHttpBody
>({
  defaultErrorMessage: "We couldn't create this household. Please try again.",
  mutationFn: createHousehold,
  mutationKey: ["households", "create"],
})

export function useCreateHouseholdMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateHouseholdHttpResponse,
    CreateHouseholdHttpBody,
    TContext
  >,
) {
  return useAppMutation(createHouseholdMutationDefinition, options)
}

export const deleteHouseholdMutationDefinition = createAppMutationDefinition<
  void,
  string
>({
  defaultErrorMessage: "We couldn't delete this household. Please try again.",
  mutationFn: deleteHousehold,
  mutationKey: ["households", "delete"],
})

export function useDeleteHouseholdMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  return useAppMutation(deleteHouseholdMutationDefinition, options)
}

type UpdateHouseholdVariables = {
  householdId: string
  body: UpdateHouseholdHttpBody
}
export const updateHouseholdMutationDefinition = createAppMutationDefinition<
  UpdateHouseholdHttpResponse,
  UpdateHouseholdVariables
>({
  defaultErrorMessage: "We couldn't update this household. Please try again.",
  mutationFn: updateHousehold,
  mutationKey: ["households", "update"],
})

export function useUpdateHouseholdMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateHouseholdHttpResponse,
    UpdateHouseholdVariables,
    TContext
  >,
) {
  return useAppMutation(updateHouseholdMutationDefinition, options)
}

type UpdateMemberVariables = {
  householdId: string
  userId: string
  body: UpdateHouseholdMemberHttpBody
}
export const updateHouseholdMemberMutationDefinition =
  createAppMutationDefinition<
    UpdateHouseholdMemberHttpResponse,
    UpdateMemberVariables
  >({
    defaultErrorMessage:
      "We couldn't update this household member. Please try again.",
    mutationFn: updateHouseholdMember,
    mutationKey: ["households", "members", "update"],
  })

export function useUpdateHouseholdMemberMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateHouseholdMemberHttpResponse,
    UpdateMemberVariables,
    TContext
  >,
) {
  return useAppMutation(updateHouseholdMemberMutationDefinition, options)
}

type HouseholdMemberVariables = { householdId: string; userId: string }
export const removeHouseholdMemberMutationDefinition =
  createAppMutationDefinition<void, HouseholdMemberVariables>({
    defaultErrorMessage:
      "We couldn't remove this household member. Please try again.",
    mutationFn: removeHouseholdMember,
    mutationKey: ["households", "members", "remove"],
  })

export function useRemoveHouseholdMemberMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, HouseholdMemberVariables, TContext>,
) {
  return useAppMutation(removeHouseholdMemberMutationDefinition, options)
}

type CreateInviteVariables = {
  householdId: string
  body: CreateHouseholdInviteHttpBody
}
export const createHouseholdInviteMutationDefinition =
  createAppMutationDefinition<
    CreateHouseholdInviteHttpResponse,
    CreateInviteVariables
  >({
    defaultErrorMessage:
      "We couldn't create this invitation. Please try again.",
    mutationFn: createHouseholdInvite,
    mutationKey: ["households", "invites", "create"],
  })

export function useCreateHouseholdInviteMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateHouseholdInviteHttpResponse,
    CreateInviteVariables,
    TContext
  >,
) {
  return useAppMutation(createHouseholdInviteMutationDefinition, options)
}

type InviteVariables = { householdId: string; inviteId: string }
export const refreshHouseholdInviteLinkMutationDefinition =
  createAppMutationDefinition<
    RefreshHouseholdInviteLinkHttpResponse,
    InviteVariables
  >({
    defaultErrorMessage:
      "We couldn't refresh this invitation link. Please try again.",
    mutationFn: refreshHouseholdInviteLink,
    mutationKey: ["households", "invites", "refresh-link"],
  })

export function useRefreshHouseholdInviteLinkMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    RefreshHouseholdInviteLinkHttpResponse,
    InviteVariables,
    TContext
  >,
) {
  return useAppMutation(refreshHouseholdInviteLinkMutationDefinition, options)
}

export const resendHouseholdInviteMutationDefinition =
  createAppMutationDefinition<void, InviteVariables>({
    defaultErrorMessage:
      "We couldn't resend this invitation. Please try again.",
    mutationFn: resendHouseholdInvite,
    mutationKey: ["households", "invites", "resend"],
  })

export function useResendHouseholdInviteMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, InviteVariables, TContext>,
) {
  return useAppMutation(resendHouseholdInviteMutationDefinition, options)
}

export const cancelHouseholdInviteMutationDefinition =
  createAppMutationDefinition<void, InviteVariables>({
    defaultErrorMessage:
      "We couldn't cancel this invitation. Please try again.",
    mutationFn: cancelHouseholdInvite,
    mutationKey: ["households", "invites", "cancel"],
  })

export function useCancelHouseholdInviteMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, InviteVariables, TContext>,
) {
  return useAppMutation(cancelHouseholdInviteMutationDefinition, options)
}

type InviteTokenVariables = { token: string }
export const acceptHouseholdInviteMutationDefinition =
  createAppMutationDefinition<
    AcceptHouseholdInviteHttpResponse,
    InviteTokenVariables
  >({
    defaultErrorMessage:
      "We couldn't accept this invitation. Please try again.",
    mutationFn: ({ token }) => acceptHouseholdInvite(token),
    mutationKey: ["households", "invites", "accept"],
  })

export function useAcceptHouseholdInviteMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    AcceptHouseholdInviteHttpResponse,
    InviteTokenVariables,
    TContext
  >,
) {
  return useAppMutation(acceptHouseholdInviteMutationDefinition, options)
}

export const acceptHouseholdInviteByIdMutationDefinition =
  createAppMutationDefinition<AcceptHouseholdInviteHttpResponse, string>({
    defaultErrorMessage:
      "We couldn't accept this invitation. Please try again.",
    mutationFn: acceptHouseholdInviteById,
    mutationKey: ["households", "invites", "accept-by-id"],
  })

export function useAcceptHouseholdInviteByIdMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    AcceptHouseholdInviteHttpResponse,
    string,
    TContext
  >,
) {
  return useAppMutation(acceptHouseholdInviteByIdMutationDefinition, options)
}

export const rejectHouseholdInviteByIdMutationDefinition =
  createAppMutationDefinition<void, string>({
    defaultErrorMessage:
      "We couldn't decline this invitation. Please try again.",
    mutationFn: rejectHouseholdInviteById,
    mutationKey: ["households", "invites", "reject-by-id"],
  })

export function useRejectHouseholdInviteByIdMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  return useAppMutation(rejectHouseholdInviteByIdMutationDefinition, options)
}

export const rejectHouseholdInviteMutationDefinition =
  createAppMutationDefinition<void, InviteTokenVariables>({
    defaultErrorMessage:
      "We couldn't reject this invitation. Please try again.",
    mutationFn: ({ token }) => rejectHouseholdInvite(token),
    mutationKey: ["households", "invites", "reject"],
  })

export function useRejectHouseholdInviteMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, InviteTokenVariables, TContext>,
) {
  return useAppMutation(rejectHouseholdInviteMutationDefinition, options)
}
