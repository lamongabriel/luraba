"use client";

import type { FxOverride, SetFxOverrideBody } from "@luraba/contracts";
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import { deleteFxOverride, setFxOverride } from "@/services/fx.service";

export const setFxOverrideMutationDefinition = createAppMutationDefinition<
  FxOverride,
  SetFxOverrideBody
>({
  defaultErrorMessage: "We couldn't save this exchange rate. Please try again.",
  mutationFn: setFxOverride,
  mutationKey: ["fx", "set-override"],
});

export function useSetFxOverrideMutation<TContext = unknown>(
  options?: UseAppMutationOptions<FxOverride, SetFxOverrideBody, TContext>,
) {
  return useAppMutation(setFxOverrideMutationDefinition, options);
}

type OverridePair = { fromCurrencyCode: string; toCurrencyCode: string };

export const deleteFxOverrideMutationDefinition = createAppMutationDefinition<void, OverridePair>({
  defaultErrorMessage: "We couldn't remove this exchange rate. Please try again.",
  mutationFn: deleteFxOverride,
  mutationKey: ["fx", "delete-override"],
});

export function useDeleteFxOverrideMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, OverridePair, TContext>,
) {
  return useAppMutation(deleteFxOverrideMutationDefinition, options);
}
