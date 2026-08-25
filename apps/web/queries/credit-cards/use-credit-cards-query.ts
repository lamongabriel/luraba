"use client"

import { useQuery } from "@tanstack/react-query"

import type {
  GetCreditCardCycleHttpResponse,
  GetCreditCardForecastHttpQuery,
  GetCreditCardForecastHttpResponse,
  GetCreditCardHttpResponse,
  GetCreditCardPaymentHttpResponse,
  GetCreditCardPurchaseHttpResponse,
  ListCreditCardCyclesHttpQuery,
  ListCreditCardCyclesHttpResponse,
  ListCreditCardsHttpQuery,
  ListCreditCardsHttpResponse,
} from "@/interfaces/http/credit-cards-http"
import type { AppQueryOptions } from "@/queries/query-options"
import {
  getCreditCard,
  getCreditCardCycle,
  getCreditCardForecast,
  getCreditCardPayment,
  getCreditCardPurchase,
  listCreditCardCycles,
  listCreditCards,
} from "@/services/credit-cards.service"

export const creditCardQueryKeys = {
  all: ["credit-cards"] as const,
  lists: () => [...creditCardQueryKeys.all, "list"] as const,
  list: (query: ListCreditCardsHttpQuery = {}) =>
    [...creditCardQueryKeys.lists(), query] as const,
  details: () => [...creditCardQueryKeys.all, "detail"] as const,
  detail: (creditCardId: string) =>
    [...creditCardQueryKeys.details(), creditCardId] as const,
  cycles: (creditCardId: string, query: ListCreditCardCyclesHttpQuery = {}) =>
    [...creditCardQueryKeys.detail(creditCardId), "cycles", query] as const,
  cycle: (creditCardId: string, cycleId: string) =>
    [...creditCardQueryKeys.detail(creditCardId), "cycle", cycleId] as const,
  purchase: (creditCardId: string, purchaseId: string) =>
    [
      ...creditCardQueryKeys.detail(creditCardId),
      "purchase",
      purchaseId,
    ] as const,
  payment: (creditCardId: string, paymentId: string) =>
    [
      ...creditCardQueryKeys.detail(creditCardId),
      "payment",
      paymentId,
    ] as const,
  forecast: (
    creditCardId: string,
    query: GetCreditCardForecastHttpQuery = {},
  ) =>
    [...creditCardQueryKeys.detail(creditCardId), "forecast", query] as const,
}

export function useCreditCardsQuery<TData = ListCreditCardsHttpResponse>(
  query: ListCreditCardsHttpQuery = {},
  options?: AppQueryOptions<ListCreditCardsHttpResponse, TData>,
) {
  return useQuery({
    queryKey: creditCardQueryKeys.list(query),
    queryFn: () => listCreditCards(query),
    ...options,
  })
}

export function useCreditCardQuery<TData = GetCreditCardHttpResponse>(
  creditCardId: string,
  options?: AppQueryOptions<GetCreditCardHttpResponse, TData>,
) {
  return useQuery({
    queryKey: creditCardQueryKeys.detail(creditCardId),
    queryFn: () => getCreditCard(creditCardId),
    ...options,
    enabled: Boolean(creditCardId) && (options?.enabled ?? true),
  })
}

export function useCreditCardCyclesQuery<
  TData = ListCreditCardCyclesHttpResponse,
>(
  creditCardId: string,
  query: ListCreditCardCyclesHttpQuery = {},
  options?: AppQueryOptions<ListCreditCardCyclesHttpResponse, TData>,
) {
  return useQuery({
    queryKey: creditCardQueryKeys.cycles(creditCardId, query),
    queryFn: () => listCreditCardCycles(creditCardId, query),
    placeholderData: (previousData) => previousData,
    ...options,
    enabled: Boolean(creditCardId) && (options?.enabled ?? true),
  })
}

export function useCreditCardCycleQuery<TData = GetCreditCardCycleHttpResponse>(
  creditCardId: string,
  cycleId: string,
  options?: AppQueryOptions<GetCreditCardCycleHttpResponse, TData>,
) {
  return useQuery({
    queryKey: creditCardQueryKeys.cycle(creditCardId, cycleId),
    queryFn: () => getCreditCardCycle({ creditCardId, cycleId }),
    ...options,
    enabled: Boolean(creditCardId && cycleId) && (options?.enabled ?? true),
  })
}

export function useCreditCardPurchaseQuery<
  TData = GetCreditCardPurchaseHttpResponse,
>(
  creditCardId: string,
  purchaseId: string,
  options?: AppQueryOptions<GetCreditCardPurchaseHttpResponse, TData>,
) {
  return useQuery({
    queryKey: creditCardQueryKeys.purchase(creditCardId, purchaseId),
    queryFn: () => getCreditCardPurchase({ creditCardId, purchaseId }),
    ...options,
    enabled: Boolean(creditCardId && purchaseId) && (options?.enabled ?? true),
  })
}

export function useCreditCardPaymentQuery<
  TData = GetCreditCardPaymentHttpResponse,
>(
  creditCardId: string,
  paymentId: string,
  options?: AppQueryOptions<GetCreditCardPaymentHttpResponse, TData>,
) {
  return useQuery({
    queryKey: creditCardQueryKeys.payment(creditCardId, paymentId),
    queryFn: () => getCreditCardPayment({ creditCardId, paymentId }),
    ...options,
    enabled: Boolean(creditCardId && paymentId) && (options?.enabled ?? true),
  })
}

export function useCreditCardForecastQuery<
  TData = GetCreditCardForecastHttpResponse,
>(
  creditCardId: string,
  query: GetCreditCardForecastHttpQuery = {},
  options?: AppQueryOptions<GetCreditCardForecastHttpResponse, TData>,
) {
  return useQuery({
    queryKey: creditCardQueryKeys.forecast(creditCardId, query),
    queryFn: () => getCreditCardForecast(creditCardId, query),
    ...options,
    enabled: Boolean(creditCardId) && (options?.enabled ?? true),
  })
}
