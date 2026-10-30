"use client";

import { useQueryClient } from "@tanstack/react-query";

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import { accountQueryKeys } from "@/queries/accounts/use-accounts-query";
import { investmentQueryKeys } from "@/queries/investments/use-investments-queries";
import * as api from "@/services/investments.service";

/** Every investment write can move positions, taxes, allocation and the account balance, so all are refreshed. */
function createInvestmentMutation<TData, TVariables>(
  name: string,
  errorMessage: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const definition = createAppMutationDefinition<TData, TVariables>({
    defaultErrorMessage: errorMessage,
    mutationFn,
    mutationKey: ["investments", name],
  });

  return function useInvestmentMutation(options?: UseAppMutationOptions<TData, TVariables>) {
    const queryClient = useQueryClient();
    return useAppMutation(definition, {
      ...options,
      onSuccess: async (...args) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: investmentQueryKeys.all }),
          queryClient.invalidateQueries({ queryKey: accountQueryKeys.all }),
        ]);
        await options?.onSuccess?.(...args);
      },
    });
  };
}

type Arg<K extends keyof typeof api, N extends 0 | 1 = 0> = Parameters<(typeof api)[K]>[N];
type WithId<K extends keyof typeof api> = { id: string; body: Arg<K, 1> };

export const useUpdateInvestmentSettingsMutation = createInvestmentMutation(
  "update-settings",
  "We couldn't save the investment settings. Please try again.",
  (body: Arg<"updateInvestmentSettings">) => api.updateInvestmentSettings(body),
);

export const useCreatePortfolioMutation = createInvestmentMutation(
  "create-portfolio",
  "We couldn't create this portfolio. Please try again.",
  (body: Arg<"createPortfolio">) => api.createPortfolio(body),
);
export const useUpdatePortfolioMutation = createInvestmentMutation(
  "update-portfolio",
  "We couldn't update this portfolio. Please try again.",
  ({ id, body }: WithId<"updatePortfolio">) => api.updatePortfolio(id, body),
);
export const useDeletePortfolioMutation = createInvestmentMutation(
  "delete-portfolio",
  "We couldn't delete this portfolio. Please try again.",
  (id: string) => api.deletePortfolio(id),
);

export const useCreateInvestmentAccountMutation = createInvestmentMutation(
  "create-account",
  "We couldn't create this investment account. Please try again.",
  (body: Arg<"createInvestmentAccount">) => api.createInvestmentAccount(body),
);
export const useUpdateInvestmentAccountSettingsMutation = createInvestmentMutation(
  "update-account-settings",
  "We couldn't update this account. Please try again.",
  ({ id, body }: WithId<"updateInvestmentAccountSettings">) =>
    api.updateInvestmentAccountSettings(id, body),
);
export const useAddCashMovementMutation = createInvestmentMutation(
  "cash-movement",
  "We couldn't record this cash movement. Please try again.",
  ({ id, body }: WithId<"addInvestmentCashMovement">) => api.addInvestmentCashMovement(id, body),
);

export const useCreateAssetMutation = createInvestmentMutation(
  "create-asset",
  "We couldn't add this asset. Please try again.",
  (body: Arg<"createAsset">) => api.createAsset(body),
);
export const useImportAssetCandidateMutation = createInvestmentMutation(
  "import-candidate",
  "We couldn't add this asset. Please try again.",
  (body: Arg<"importAssetCandidate">) => api.importAssetCandidate(body),
);
export const useUpdateAssetMutation = createInvestmentMutation(
  "update-asset",
  "We couldn't update this asset. Please try again.",
  ({ id, body }: WithId<"updateAsset">) => api.updateAsset(id, body),
);
export const useSetFixedIncomeTermsMutation = createInvestmentMutation(
  "fixed-income-terms",
  "We couldn't save the fixed-income terms. Please try again.",
  ({ id, body }: WithId<"setFixedIncomeTerms">) => api.setFixedIncomeTerms(id, body),
);
export const useSetManualPriceMutation = createInvestmentMutation(
  "manual-price",
  "We couldn't save this price. Please try again.",
  ({ id, body }: WithId<"setManualPrice">) => api.setManualPrice(id, body),
);

export const useCreateInvestmentEventMutation = createInvestmentMutation(
  "create-event",
  "We couldn't record this transaction. Please try again.",
  (body: Arg<"createInvestmentEvent">) => api.createInvestmentEvent(body),
);
export const useUpdateInvestmentEventMutation = createInvestmentMutation(
  "update-event",
  "We couldn't update this transaction. Please try again.",
  ({ id, body }: WithId<"updateInvestmentEvent">) => api.updateInvestmentEvent(id, body),
);
export const useDeleteInvestmentEventMutation = createInvestmentMutation(
  "delete-event",
  "We couldn't delete this transaction. Please try again.",
  (id: string) => api.deleteInvestmentEvent(id),
);

export const useMarkDarfPaidMutation = createInvestmentMutation(
  "mark-darf-paid",
  "We couldn't mark this DARF as paid. Please try again.",
  (body: Arg<"markDarfPaid">) => api.markDarfPaid(body),
);
export const useSetAllocationTargetsMutation = createInvestmentMutation(
  "allocation-targets",
  "We couldn't save the allocation targets. Please try again.",
  ({ id, body }: WithId<"setAllocationTargets">) => api.setAllocationTargets(id, body),
);

export const useUpdateMarketDataProviderMutation = createInvestmentMutation(
  "update-provider",
  "We couldn't update this provider. Please try again.",
  ({ id, body }: WithId<"updateMarketDataProvider">) => api.updateMarketDataProvider(id, body),
);
export const useRefreshInvestmentPricesMutation = createInvestmentMutation(
  "refresh-prices",
  "We couldn't refresh prices right now. Please try again.",
  (body: Arg<"refreshInvestmentPrices"> | undefined) => api.refreshInvestmentPrices(body),
);

export const usePreviewInvestmentImportMutation = createInvestmentMutation(
  "preview-import",
  "We couldn't read this file. Please check the format and try again.",
  (body: Arg<"previewInvestmentImport">) => api.previewInvestmentImport(body),
);
export const useCommitInvestmentImportMutation = createInvestmentMutation(
  "commit-import",
  "We couldn't import these transactions. Please try again.",
  ({ id, body }: WithId<"commitInvestmentImport">) => api.commitInvestmentImport(id, body),
);
