"use client"

import { useQuery } from "@tanstack/react-query"

import type {
  GetAccountHttpResponse,
  ListAccountsHttpQuery,
  ListAccountsHttpResponse,
  ListAccountTransactionsHttpQuery,
  ListAccountTransactionsHttpResponse,
} from "@/interfaces/http/accounts-http"
import type { AppQueryOptions } from "@/queries/query-options"
import {
  getAccount,
  listAccounts,
  listAccountTransactions,
} from "@/services/accounts.service"

export const accountQueryKeys = {
  all: ["accounts"] as const,
  lists: () => [...accountQueryKeys.all, "list"] as const,
  list: (query: ListAccountsHttpQuery = {}) =>
    [...accountQueryKeys.lists(), query] as const,
  details: () => [...accountQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...accountQueryKeys.details(), id] as const,
  transactions: (id: string, query: ListAccountTransactionsHttpQuery = {}) =>
    [...accountQueryKeys.detail(id), "transactions", query] as const,
}

export function useAccountsQuery<TData = ListAccountsHttpResponse>(
  query: ListAccountsHttpQuery = {},
  options?: AppQueryOptions<ListAccountsHttpResponse, TData>,
) {
  return useQuery({
    queryKey: accountQueryKeys.list(query),
    queryFn: () => listAccounts(query),
    ...options,
  })
}

export function useAccountQuery<TData = GetAccountHttpResponse>(
  id: string,
  options?: AppQueryOptions<GetAccountHttpResponse, TData>,
) {
  return useQuery({
    queryKey: accountQueryKeys.detail(id),
    queryFn: () => getAccount(id),
    ...options,
    enabled: Boolean(id) && (options?.enabled ?? true),
  })
}

export function useAccountTransactionsQuery<
  TData = ListAccountTransactionsHttpResponse,
>(
  id: string,
  query: ListAccountTransactionsHttpQuery = {},
  options?: AppQueryOptions<ListAccountTransactionsHttpResponse, TData>,
) {
  return useQuery({
    queryKey: accountQueryKeys.transactions(id, query),
    queryFn: () => listAccountTransactions(id, query),
    placeholderData: (previousData) => previousData,
    ...options,
    enabled: Boolean(id) && (options?.enabled ?? true),
  })
}
