"use client";

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import { createMerchant, deleteMerchant, updateMerchant } from "@/services/merchants.service";

type CreateMerchantBody = Parameters<typeof createMerchant>[0];
type CreateMerchantResponse = Awaited<ReturnType<typeof createMerchant>>;
type UpdateMerchantVariables = {
  id: string;
  body: Parameters<typeof updateMerchant>[1];
};
type UpdateMerchantResponse = Awaited<ReturnType<typeof updateMerchant>>;

export const createMerchantMutationDefinition = createAppMutationDefinition<
  CreateMerchantResponse,
  CreateMerchantBody
>({
  defaultErrorMessage: "We couldn't create this merchant. Please try again.",
  mutationFn: createMerchant,
  mutationKey: ["merchants", "create"],
});
export function useCreateMerchantMutation<TContext = unknown>(
  options?: UseAppMutationOptions<CreateMerchantResponse, CreateMerchantBody, TContext>,
) {
  return useAppMutation(createMerchantMutationDefinition, options);
}

export const updateMerchantMutationDefinition = createAppMutationDefinition<
  UpdateMerchantResponse,
  UpdateMerchantVariables
>({
  defaultErrorMessage: "We couldn't update this merchant. Please try again.",
  mutationFn: ({ id, body }) => updateMerchant(id, body),
  mutationKey: ["merchants", "update"],
});
export function useUpdateMerchantMutation<TContext = unknown>(
  options?: UseAppMutationOptions<UpdateMerchantResponse, UpdateMerchantVariables, TContext>,
) {
  return useAppMutation(updateMerchantMutationDefinition, options);
}

export const deleteMerchantMutationDefinition = createAppMutationDefinition<void, string>({
  defaultErrorMessage: "We couldn't delete this merchant. Please try again.",
  mutationFn: deleteMerchant,
  mutationKey: ["merchants", "delete"],
});
export function useDeleteMerchantMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  return useAppMutation(deleteMerchantMutationDefinition, options);
}
