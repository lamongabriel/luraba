"use client";

import { useQuery } from "@tanstack/react-query";

import type { AppQueryOptions } from "@/queries/query-options";
import * as api from "@/services/investments.service";

type Q<K extends keyof typeof api> = Parameters<(typeof api)[K]>[0];

/** Dashboard, positions and allocation are re-fetched while stale quotes are refreshed in the background. */
export const REFRESHING_POLL_MS = 6000;

export const investmentQueryKeys = {
  all: ["investments"] as const,
  settings: () => [...investmentQueryKeys.all, "settings"] as const,
  portfolios: () => [...investmentQueryKeys.all, "portfolios"] as const,
  accounts: () => [...investmentQueryKeys.all, "accounts"] as const,
  account: (id: string) => [...investmentQueryKeys.accounts(), id] as const,
  accountCash: (id: string) => [...investmentQueryKeys.accounts(), id, "cash"] as const,
  assets: (query?: unknown) => [...investmentQueryKeys.all, "assets", query ?? {}] as const,
  assetSearch: (query: unknown) => [...investmentQueryKeys.all, "asset-search", query] as const,
  asset: (id: string) => [...investmentQueryKeys.all, "asset", id] as const,
  assetDetail: (id: string, query?: unknown) =>
    [...investmentQueryKeys.asset(id), "detail", query ?? {}] as const,
  events: (query?: unknown) => [...investmentQueryKeys.all, "events", query ?? {}] as const,
  positions: (query?: unknown) => [...investmentQueryKeys.all, "positions", query ?? {}] as const,
  dashboard: (query?: unknown) => [...investmentQueryKeys.all, "dashboard", query ?? {}] as const,
  income: (query?: unknown) => [...investmentQueryKeys.all, "income", query ?? {}] as const,
  taxes: (query: unknown) => [...investmentQueryKeys.all, "taxes", query] as const,
  corporateActions: (query?: unknown) =>
    [...investmentQueryKeys.all, "corporate-actions", query ?? {}] as const,
  allocation: (query?: unknown) => [...investmentQueryKeys.all, "allocation", query ?? {}] as const,
  rebalance: (query: unknown) => [...investmentQueryKeys.all, "rebalance", query] as const,
  providers: () => [...investmentQueryKeys.all, "providers"] as const,
};

type Opts<T, D = T> = AppQueryOptions<T, D>;
type Res<K extends keyof typeof api> = Awaited<ReturnType<(typeof api)[K]>>;

export function useInvestmentSettingsQuery<D = Res<"getInvestmentSettings">>(
  options?: Opts<Res<"getInvestmentSettings">, D>,
) {
  return useQuery({
    queryKey: investmentQueryKeys.settings(),
    queryFn: () => api.getInvestmentSettings(),
    ...options,
  });
}

export function usePortfoliosQuery<D = Res<"listPortfolios">>(
  options?: Opts<Res<"listPortfolios">, D>,
) {
  return useQuery({
    queryKey: investmentQueryKeys.portfolios(),
    queryFn: () => api.listPortfolios(),
    ...options,
  });
}

export function useInvestmentAccountsQuery<D = Res<"listInvestmentAccounts">>(
  options?: Opts<Res<"listInvestmentAccounts">, D>,
) {
  return useQuery({
    queryKey: investmentQueryKeys.accounts(),
    queryFn: () => api.listInvestmentAccounts(),
    ...options,
  });
}

export function useInvestmentAccountQuery<D = Res<"getInvestmentAccount">>(
  id: string,
  options?: Opts<Res<"getInvestmentAccount">, D>,
) {
  return useQuery({
    queryKey: investmentQueryKeys.account(id),
    queryFn: () => api.getInvestmentAccount(id),
    ...options,
  });
}

export function useInvestmentAccountCashQuery<D = Res<"getInvestmentAccountCash">>(
  id: string,
  options?: Opts<Res<"getInvestmentAccountCash">, D>,
) {
  return useQuery({
    queryKey: investmentQueryKeys.accountCash(id),
    queryFn: () => api.getInvestmentAccountCash(id),
    ...options,
  });
}

export function useAssetsQuery<D = Res<"listAssets">>(
  query: Q<"listAssets"> = {},
  options?: Opts<Res<"listAssets">, D>,
) {
  return useQuery({
    queryKey: investmentQueryKeys.assets(query),
    queryFn: () => api.listAssets(query),
    ...options,
  });
}

export function useAssetSearchQuery<D = Res<"searchAssets">>(
  query: Q<"searchAssets">,
  options?: Opts<Res<"searchAssets">, D>,
) {
  return useQuery({
    queryKey: investmentQueryKeys.assetSearch(query),
    queryFn: () => api.searchAssets(query),
    ...options,
  });
}

export function useAssetQuery<D = Res<"getAsset">>(id: string, options?: Opts<Res<"getAsset">, D>) {
  return useQuery({
    queryKey: investmentQueryKeys.asset(id),
    queryFn: () => api.getAsset(id),
    ...options,
  });
}

export function useAssetDetailQuery<D = Res<"getAssetDetail">>(
  id: string,
  query: Parameters<typeof api.getAssetDetail>[1] = {},
  options?: Opts<Res<"getAssetDetail">, D>,
) {
  return useQuery({
    queryKey: investmentQueryKeys.assetDetail(id, query),
    queryFn: () => api.getAssetDetail(id, query),
    ...options,
  });
}

export function useInvestmentEventsQuery<D = Res<"listInvestmentEvents">>(
  query: Q<"listInvestmentEvents"> = {},
  options?: Opts<Res<"listInvestmentEvents">, D>,
) {
  return useQuery({
    queryKey: investmentQueryKeys.events(query),
    queryFn: () => api.listInvestmentEvents(query),
    ...options,
  });
}

export function usePositionsQuery<D = Res<"listPositions">>(
  query: Q<"listPositions"> = {},
  options?: Opts<Res<"listPositions">, D>,
) {
  return useQuery({
    queryKey: investmentQueryKeys.positions(query),
    queryFn: () => api.listPositions(query),
    ...options,
  });
}

/** Serves cached quotes at once; keeps polling while the API refreshes stale quotes in the background. */
export function useInvestmentDashboardQuery(
  query: Q<"getInvestmentDashboard"> = {},
  options?: Opts<Res<"getInvestmentDashboard">>,
) {
  return useQuery({
    queryKey: investmentQueryKeys.dashboard(query),
    queryFn: () => api.getInvestmentDashboard(query),
    refetchInterval: (state) =>
      state.state.data?.priceFreshness.refreshing ? REFRESHING_POLL_MS : false,
    ...options,
  });
}

export function useInvestmentIncomeQuery<D = Res<"getInvestmentIncome">>(
  query: Q<"getInvestmentIncome"> = {},
  options?: Opts<Res<"getInvestmentIncome">, D>,
) {
  return useQuery({
    queryKey: investmentQueryKeys.income(query),
    queryFn: () => api.getInvestmentIncome(query),
    ...options,
  });
}

export function useInvestmentTaxesQuery<D = Res<"getInvestmentTaxes">>(
  query: Q<"getInvestmentTaxes">,
  options?: Opts<Res<"getInvestmentTaxes">, D>,
) {
  return useQuery({
    queryKey: investmentQueryKeys.taxes(query),
    queryFn: () => api.getInvestmentTaxes(query),
    ...options,
  });
}

export function useCorporateActionsQuery<D = Res<"listCorporateActions">>(
  query: Q<"listCorporateActions"> = {},
  options?: Opts<Res<"listCorporateActions">, D>,
) {
  return useQuery({
    queryKey: investmentQueryKeys.corporateActions(query),
    queryFn: () => api.listCorporateActions(query),
    ...options,
  });
}

export function useAllocationQuery<D = Res<"getAllocation">>(
  query: Q<"getAllocation"> = {},
  options?: Opts<Res<"getAllocation">, D>,
) {
  return useQuery({
    queryKey: investmentQueryKeys.allocation(query),
    queryFn: () => api.getAllocation(query),
    ...options,
  });
}

export function useRebalanceQuery<D = Res<"getRebalance">>(
  query: Q<"getRebalance">,
  options?: Opts<Res<"getRebalance">, D>,
) {
  return useQuery({
    queryKey: investmentQueryKeys.rebalance(query),
    queryFn: () => api.getRebalance(query),
    ...options,
  });
}

export function useMarketDataProvidersQuery<D = Res<"listMarketDataProviders">>(
  options?: Opts<Res<"listMarketDataProviders">, D>,
) {
  return useQuery({
    queryKey: investmentQueryKeys.providers(),
    queryFn: () => api.listMarketDataProviders(),
    ...options,
  });
}
