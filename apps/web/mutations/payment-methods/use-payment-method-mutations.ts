"use client";

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import {
  createPaymentMethod,
  deletePaymentMethod,
  updatePaymentMethod,
} from "@/services/payment-methods.service";

type CreatePaymentMethodBody = Parameters<typeof createPaymentMethod>[0];
type CreatePaymentMethodResponse = Awaited<ReturnType<typeof createPaymentMethod>>;
type UpdatePaymentMethodVariables = {
  id: string;
  body: Parameters<typeof updatePaymentMethod>[1];
};
type UpdatePaymentMethodResponse = Awaited<ReturnType<typeof updatePaymentMethod>>;

export const createPaymentMethodMutationDefinition = createAppMutationDefinition<
  CreatePaymentMethodResponse,
  CreatePaymentMethodBody
>({
  defaultErrorMessage: "We couldn't create this payment method. Please try again.",
  mutationFn: createPaymentMethod,
  mutationKey: ["payment-methods", "create"],
});
export function useCreatePaymentMethodMutation<TContext = unknown>(
  options?: UseAppMutationOptions<CreatePaymentMethodResponse, CreatePaymentMethodBody, TContext>,
) {
  return useAppMutation(createPaymentMethodMutationDefinition, options);
}

export const updatePaymentMethodMutationDefinition = createAppMutationDefinition<
  UpdatePaymentMethodResponse,
  UpdatePaymentMethodVariables
>({
  defaultErrorMessage: "We couldn't update this payment method. Please try again.",
  mutationFn: ({ id, body }) => updatePaymentMethod(id, body),
  mutationKey: ["payment-methods", "update"],
});
export function useUpdatePaymentMethodMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdatePaymentMethodResponse,
    UpdatePaymentMethodVariables,
    TContext
  >,
) {
  return useAppMutation(updatePaymentMethodMutationDefinition, options);
}

export const deletePaymentMethodMutationDefinition = createAppMutationDefinition<void, string>({
  defaultErrorMessage: "We couldn't delete this payment method. Please try again.",
  mutationFn: deletePaymentMethod,
  mutationKey: ["payment-methods", "delete"],
});
export function useDeletePaymentMethodMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  return useAppMutation(deletePaymentMethodMutationDefinition, options);
}
