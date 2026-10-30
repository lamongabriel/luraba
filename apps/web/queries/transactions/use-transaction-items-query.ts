"use client";

import { useQuery } from "@tanstack/react-query";

import { listTransactionItems } from "@/services/transaction-items.service";

export const transactionItemsQueryKeys = {
  all: ["transaction-items"] as const,
  detail: (transactionId: string) => [...transactionItemsQueryKeys.all, transactionId] as const,
};

export function useTransactionItemsQuery(transactionId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: transactionItemsQueryKeys.detail(transactionId),
    queryFn: () => listTransactionItems(transactionId),
    ...options,
    enabled: Boolean(transactionId) && (options?.enabled ?? true),
  });
}
