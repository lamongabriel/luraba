"use client"

import {
  queryOptions,
  useQuery,
} from "@tanstack/react-query"

import { listAccounts } from "@/services/accounts.service"

export const accountQueryKeys = {
  list: ["accounts"] as const,
}

export function getAccountsQueryOptions() {
  return queryOptions({
    queryKey: accountQueryKeys.list,
    queryFn: () => listAccounts(),
  })
}

export function useAccountsQuery(enabled = true) {
  return useQuery({
    ...getAccountsQueryOptions(),
    enabled,
  })
}
