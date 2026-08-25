"use client"

import { useQuery } from "@tanstack/react-query"

import type {
  ListPaymentMethodsHttpQuery,
  ListPaymentMethodsHttpResponse,
} from "@/interfaces/http/payment-methods-http"
import type { AppQueryOptions } from "@/queries/query-options"
import { listPaymentMethods } from "@/services/payment-methods.service"

export const paymentMethodQueryKeys = {
  all: ["payment-methods"] as const,
  lists: () => [...paymentMethodQueryKeys.all, "list"] as const,
  list: (query: ListPaymentMethodsHttpQuery = {}) =>
    [...paymentMethodQueryKeys.lists(), query] as const,
}

export function usePaymentMethodsQuery<TData = ListPaymentMethodsHttpResponse>(
  query: ListPaymentMethodsHttpQuery = {},
  options?: AppQueryOptions<ListPaymentMethodsHttpResponse, TData>,
) {
  return useQuery({
    queryKey: paymentMethodQueryKeys.list(query),
    queryFn: () => listPaymentMethods(query),
    ...options,
  })
}
