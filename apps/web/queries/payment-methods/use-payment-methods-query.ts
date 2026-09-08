"use client";

import { useQuery } from "@tanstack/react-query";

import type { AppQueryOptions } from "@/queries/query-options";
import { listPaymentMethods } from "@/services/payment-methods.service";

type ListPaymentMethodsQuery = NonNullable<Parameters<typeof listPaymentMethods>[0]>;
type ListPaymentMethodsResponse = Awaited<ReturnType<typeof listPaymentMethods>>;

export const paymentMethodQueryKeys = {
  all: ["payment-methods"] as const,
  lists: () => [...paymentMethodQueryKeys.all, "list"] as const,
  list: (query: ListPaymentMethodsQuery = {}) =>
    [...paymentMethodQueryKeys.lists(), query] as const,
};

export function usePaymentMethodsQuery<TData = ListPaymentMethodsResponse>(
  query: ListPaymentMethodsQuery = {},
  options?: AppQueryOptions<ListPaymentMethodsResponse, TData>,
) {
  return useQuery({
    queryKey: paymentMethodQueryKeys.list(query),
    queryFn: () => listPaymentMethods(query),
    ...options,
  });
}
