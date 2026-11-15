"use client";

import { useQueryClient } from "@tanstack/react-query";

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import { accountQueryKeys } from "@/queries/accounts/use-accounts-query";
import { goalQueryKeys } from "@/queries/goals/use-goals-queries";
import { piggyBankQueryKeys } from "@/queries/piggy-banks/use-piggy-banks-queries";
import { transactionQueryKeys } from "@/queries/transactions/use-transactions-query";
import * as api from "@/services/piggy-banks.service";

/**
 * A piggy bank change can move an account's balance, post transactions and change a linked goal's
 * progress, so every write refreshes the piggy banks, accounts, transactions and goals.
 */
function createPiggyBankMutation<TData, TVariables>(
  name: string,
  errorMessage: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const definition = createAppMutationDefinition<TData, TVariables>({
    defaultErrorMessage: errorMessage,
    mutationFn,
    mutationKey: ["piggy-banks", name],
  });

  return function usePiggyBankMutation(options?: UseAppMutationOptions<TData, TVariables>) {
    const queryClient = useQueryClient();
    return useAppMutation(definition, {
      ...options,
      onSuccess: async (...args) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: piggyBankQueryKeys.all }),
          queryClient.invalidateQueries({ queryKey: accountQueryKeys.all }),
          queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
          queryClient.invalidateQueries({ queryKey: goalQueryKeys.all }),
        ]);
        await options?.onSuccess?.(...args);
      },
    });
  };
}

type Body<T extends (...args: never[]) => unknown, I extends number = 1> = Parameters<T>[I];

export const useCreatePiggyBankMutation = createPiggyBankMutation(
  "create",
  "We couldn't create this piggy bank. Please try again.",
  api.createPiggyBank,
);
export const useUpdatePiggyBankMutation = createPiggyBankMutation(
  "update",
  "We couldn't update this piggy bank. Please try again.",
  ({ id, body }: { id: string; body: Body<typeof api.updatePiggyBank> }) =>
    api.updatePiggyBank(id, body),
);
export const useArchivePiggyBankMutation = createPiggyBankMutation(
  "archive",
  "We couldn't archive this piggy bank. Please try again.",
  api.archivePiggyBank,
);
export const useUnarchivePiggyBankMutation = createPiggyBankMutation(
  "unarchive",
  "We couldn't restore this piggy bank. Please try again.",
  api.unarchivePiggyBank,
);
export const useDepositToPiggyBankMutation = createPiggyBankMutation(
  "deposit",
  "We couldn't record this deposit. Please try again.",
  ({ id, body }: { id: string; body: Body<typeof api.depositToPiggyBank> }) =>
    api.depositToPiggyBank(id, body),
);
export const useWithdrawFromPiggyBankMutation = createPiggyBankMutation(
  "withdraw",
  "We couldn't record this withdrawal. Please try again.",
  ({ id, body }: { id: string; body: Body<typeof api.withdrawFromPiggyBank> }) =>
    api.withdrawFromPiggyBank(id, body),
);
export const useBulkDepositMutation = createPiggyBankMutation(
  "bulk-deposit",
  "We couldn't split this deposit. Please try again.",
  api.bulkDeposit,
);
export const useMovePiggyBankFundsMutation = createPiggyBankMutation(
  "move",
  "We couldn't move this money. Please try again.",
  api.movePiggyBankFunds,
);
export const useSetPiggyBankBalanceMutation = createPiggyBankMutation(
  "set-balance",
  "We couldn't set this balance. Please try again.",
  ({ id, body }: { id: string; body: Body<typeof api.setPiggyBankBalance> }) =>
    api.setPiggyBankBalance(id, body),
);
export const useSetGoalPiggyBanksMutation = createPiggyBankMutation(
  "set-goal-links",
  "We couldn't update the linked piggy banks. Please try again.",
  ({ goalId, piggyBankIds }: { goalId: string; piggyBankIds: string[] }) =>
    api.setGoalPiggyBanks(goalId, piggyBankIds),
);
