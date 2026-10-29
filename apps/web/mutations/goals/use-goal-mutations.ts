"use client";

import { useQueryClient } from "@tanstack/react-query";

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import { goalQueryKeys } from "@/queries/goals/use-goals-queries";
import * as api from "@/services/goals.service";

/** A goal's progress depends on all its contributions, so every change refreshes all goal data. */
function createGoalMutation<TData, TVariables>(
  name: string,
  errorMessage: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const definition = createAppMutationDefinition<TData, TVariables>({
    defaultErrorMessage: errorMessage,
    mutationFn,
    mutationKey: ["goals", name],
  });

  return function useGoalMutation(options?: UseAppMutationOptions<TData, TVariables>) {
    const queryClient = useQueryClient();
    return useAppMutation(definition, {
      ...options,
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: goalQueryKeys.all });
        await options?.onSuccess?.(...args);
      },
    });
  };
}

export const useCreateGoalMutation = createGoalMutation(
  "create",
  "We couldn't create this goal. Please try again.",
  api.createGoal,
);
export const useUpdateGoalMutation = createGoalMutation(
  "update",
  "We couldn't update this goal. Please try again.",
  ({ id, body }: { id: string; body: Parameters<typeof api.updateGoal>[1] }) =>
    api.updateGoal(id, body),
);
export const useDeleteGoalMutation = createGoalMutation(
  "delete",
  "We couldn't delete this goal. Please try again.",
  api.deleteGoal,
);
export const useAddContributionMutation = createGoalMutation(
  "add-contribution",
  "We couldn't record this contribution. Please try again.",
  ({ id, body }: { id: string; body: Parameters<typeof api.addContribution>[1] }) =>
    api.addContribution(id, body),
);
export const useUpdateContributionMutation = createGoalMutation(
  "update-contribution",
  "We couldn't update this contribution. Please try again.",
  ({
    target,
    body,
  }: {
    target: api.ContributionTarget;
    body: Parameters<typeof api.updateContribution>[1];
  }) => api.updateContribution(target, body),
);
export const useRemoveContributionMutation = createGoalMutation(
  "remove-contribution",
  "We couldn't remove this contribution. Please try again.",
  api.removeContribution,
);
