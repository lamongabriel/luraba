"use client";

import type {
  CreditCardForecastQuery,
  GetCreditCardCycleResult,
  GetCreditCardForecastResult,
  GetCreditCardPaymentResult,
  GetCreditCardPurchaseResult,
  GetCreditCardResult,
  ListCreditCardCyclesQuery,
  ListCreditCardCyclesResult,
  ListCreditCardsQuery,
  ListCreditCardsResult,
} from "@luraba/contracts";
import { useQuery } from "@tanstack/react-query";
import type { AppQueryOptions } from "@/queries/query-options";
import {
  getCreditCard,
  getCreditCardCycle,
  getCreditCardForecast,
  getCreditCardPayment,
  getCreditCardPurchase,
  listCreditCardCycles,
  listCreditCards,
} from "@/services/credit-cards.service";

export const creditCardQueryKeys = {
  all: ["credit-cards"] as const,
  lists: () => [...creditCardQueryKeys.all, "list"] as const,
  list: (query: ListCreditCardsQuery = {}) => [...creditCardQueryKeys.lists(), query] as const,
  details: () => [...creditCardQueryKeys.all, "detail"] as const,
  detail: (creditCardId: string) => [...creditCardQueryKeys.details(), creditCardId] as const,
  cycles: (creditCardId: string, query: ListCreditCardCyclesQuery = {}) =>
    [...creditCardQueryKeys.detail(creditCardId), "cycles", query] as const,
  cycle: (creditCardId: string, cycleId: string) =>
    [...creditCardQueryKeys.detail(creditCardId), "cycle", cycleId] as const,
  purchase: (creditCardId: string, purchaseId: string) =>
    [...creditCardQueryKeys.detail(creditCardId), "purchase", purchaseId] as const,
  payment: (creditCardId: string, paymentId: string) =>
    [...creditCardQueryKeys.detail(creditCardId), "payment", paymentId] as const,
  forecast: (creditCardId: string, query: CreditCardForecastQuery = {}) =>
    [...creditCardQueryKeys.detail(creditCardId), "forecast", query] as const,
};

export function useCreditCardsQuery<TData = ListCreditCardsResult>(
  query: ListCreditCardsQuery = {},
  options?: AppQueryOptions<ListCreditCardsResult, TData>,
) {
  return useQuery({
    queryKey: creditCardQueryKeys.list(query),
    queryFn: () => listCreditCards(query),
    ...options,
  });
}

export function useCreditCardQuery<TData = GetCreditCardResult>(
  creditCardId: string,
  options?: AppQueryOptions<GetCreditCardResult, TData>,
) {
  return useQuery({
    queryKey: creditCardQueryKeys.detail(creditCardId),
    queryFn: () => getCreditCard(creditCardId),
    ...options,
    enabled: Boolean(creditCardId) && (options?.enabled ?? true),
  });
}

export function useCreditCardCyclesQuery<TData = ListCreditCardCyclesResult>(
  creditCardId: string,
  query: ListCreditCardCyclesQuery = {},
  options?: AppQueryOptions<ListCreditCardCyclesResult, TData>,
) {
  return useQuery({
    queryKey: creditCardQueryKeys.cycles(creditCardId, query),
    queryFn: () => listCreditCardCycles(creditCardId, query),
    placeholderData: (previousData) => previousData,
    ...options,
    enabled: Boolean(creditCardId) && (options?.enabled ?? true),
  });
}

export function useCreditCardCycleQuery<TData = GetCreditCardCycleResult>(
  creditCardId: string,
  cycleId: string,
  options?: AppQueryOptions<GetCreditCardCycleResult, TData>,
) {
  return useQuery({
    queryKey: creditCardQueryKeys.cycle(creditCardId, cycleId),
    queryFn: () => getCreditCardCycle(creditCardId, cycleId),
    ...options,
    enabled: Boolean(creditCardId && cycleId) && (options?.enabled ?? true),
  });
}

export function useCreditCardPurchaseQuery<TData = GetCreditCardPurchaseResult>(
  creditCardId: string,
  purchaseId: string,
  options?: AppQueryOptions<GetCreditCardPurchaseResult, TData>,
) {
  return useQuery({
    queryKey: creditCardQueryKeys.purchase(creditCardId, purchaseId),
    queryFn: () => getCreditCardPurchase(creditCardId, purchaseId),
    ...options,
    enabled: Boolean(creditCardId && purchaseId) && (options?.enabled ?? true),
  });
}

export function useCreditCardPaymentQuery<TData = GetCreditCardPaymentResult>(
  creditCardId: string,
  paymentId: string,
  options?: AppQueryOptions<GetCreditCardPaymentResult, TData>,
) {
  return useQuery({
    queryKey: creditCardQueryKeys.payment(creditCardId, paymentId),
    queryFn: () => getCreditCardPayment(creditCardId, paymentId),
    ...options,
    enabled: Boolean(creditCardId && paymentId) && (options?.enabled ?? true),
  });
}

export function useCreditCardForecastQuery<TData = GetCreditCardForecastResult>(
  creditCardId: string,
  query: CreditCardForecastQuery = {},
  options?: AppQueryOptions<GetCreditCardForecastResult, TData>,
) {
  return useQuery({
    queryKey: creditCardQueryKeys.forecast(creditCardId, query),
    queryFn: () => getCreditCardForecast(creditCardId, query),
    ...options,
    enabled: Boolean(creditCardId) && (options?.enabled ?? true),
  });
}
