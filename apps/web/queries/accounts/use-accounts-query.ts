"use client";

import type {
  AccountInsightsQuery,
  GetAccountInsightsResult,
  GetAccountResult,
  ListAccountsQuery,
  ListAccountsResult,
  ListAccountTransactionsQuery,
  ListAccountTransactionsResult,
} from "@luraba/contracts";
import { useQuery } from "@tanstack/react-query";
import type { AppQueryOptions } from "@/queries/query-options";
import {
  getAccount,
  getAccountInsights,
  listAccounts,
  listAccountTransactions,
} from "@/services/accounts.service";

export const accountQueryKeys = {
  all: ["accounts"] as const,
  lists: () => [...accountQueryKeys.all, "list"] as const,
  list: (query: ListAccountsQuery = {}) => [...accountQueryKeys.lists(), query] as const,
  details: () => [...accountQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...accountQueryKeys.details(), id] as const,
  insights: (id: string, query: AccountInsightsQuery = {}) =>
    [...accountQueryKeys.detail(id), "insights", query] as const,
  transactions: (id: string, query: ListAccountTransactionsQuery = {}) =>
    [...accountQueryKeys.detail(id), "transactions", query] as const,
};

export function useAccountsQuery<TData = ListAccountsResult>(
  query: ListAccountsQuery = {},
  options?: AppQueryOptions<ListAccountsResult, TData>,
) {
  return useQuery({
    queryKey: accountQueryKeys.list(query),
    queryFn: () => listAccounts(query),
    ...options,
  });
}

export function useAccountQuery<TData = GetAccountResult>(
  id: string,
  options?: AppQueryOptions<GetAccountResult, TData>,
) {
  return useQuery({
    queryKey: accountQueryKeys.detail(id),
    queryFn: () => getAccount(id),
    ...options,
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

export function useAccountTransactionsQuery<TData = ListAccountTransactionsResult>(
  id: string,
  query: ListAccountTransactionsQuery = {},
  options?: AppQueryOptions<ListAccountTransactionsResult, TData>,
) {
  return useQuery({
    queryKey: accountQueryKeys.transactions(id, query),
    queryFn: () => listAccountTransactions(id, query),
    placeholderData: (previousData) => previousData,
    ...options,
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

export function useAccountInsightsQuery<TData = GetAccountInsightsResult>(
  id: string,
  query: AccountInsightsQuery = {},
  options?: AppQueryOptions<GetAccountInsightsResult, TData>,
) {
  return useQuery({
    queryKey: accountQueryKeys.insights(id, query),
    queryFn: () => getAccountInsights(id, query),
    placeholderData: (previousData) => previousData,
    ...options,
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}
