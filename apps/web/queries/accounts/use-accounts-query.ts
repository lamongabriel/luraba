"use client";

import type {
  GetAccountResult,
  ListAccountsQuery,
  ListAccountsResult,
  ListAccountTransactionsQuery,
  ListAccountTransactionsResult,
} from "@luraba/contracts";
import { useQuery } from "@tanstack/react-query";
import type { AppQueryOptions } from "@/queries/query-options";
import { getAccount, listAccounts, listAccountTransactions } from "@/services/accounts.service";

export const accountQueryKeys = {
  all: ["accounts"] as const,
  lists: () => [...accountQueryKeys.all, "list"] as const,
  list: (query: ListAccountsQuery = {}) => [...accountQueryKeys.lists(), query] as const,
  details: () => [...accountQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...accountQueryKeys.details(), id] as const,
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
