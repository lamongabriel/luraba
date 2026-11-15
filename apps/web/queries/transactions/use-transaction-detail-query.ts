"use client";

import { useQuery } from "@tanstack/react-query";

import { getTransaction } from "@/services/transactions.service";
import { transactionQueryKeys } from "./use-transactions-query";

/** One transaction with its net cost (`moneyBack`) and, for money back, the purchase it is linked to. */
export function useTransactionDetailQuery(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: transactionQueryKeys.detail(id ?? ""),
    queryFn: () => getTransaction(id as string),
    enabled: Boolean(id) && enabled,
    staleTime: 0,
  });
}
