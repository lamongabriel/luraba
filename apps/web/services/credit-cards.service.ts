"use client"

import {
  type CreateCreditCardInput,
  type CreateCreditCardPaymentInput,
  type CreateCreditCardPaymentResult,
  type CreateCreditCardPurchaseInput,
  type CreateCreditCardPurchaseResult,
  type CreateCreditCardResult,
  type CreditCardForecastQuery,
  creditCardsEndpoints,
  type DeleteCreditCardPaymentResult,
  type DeleteCreditCardPurchaseResult,
  type DeleteCreditCardResult,
  type GetCreditCardCycleResult,
  type GetCreditCardForecastResult,
  type GetCreditCardPaymentResult,
  type GetCreditCardPurchaseResult,
  type GetCreditCardResult,
  type ListCreditCardCyclesQuery,
  type ListCreditCardCyclesResult,
  type ListCreditCardsQuery,
  type ListCreditCardsResult,
  type UpdateCreditCardCycleInput,
  type UpdateCreditCardCycleResult,
  type UpdateCreditCardInput,
  type UpdateCreditCardPaymentInput,
  type UpdateCreditCardPaymentResult,
  type UpdateCreditCardPurchaseInput,
  type UpdateCreditCardPurchaseResult,
  type UpdateCreditCardResult,
} from "@luraba/contracts"
import { requestContract } from "@/services/contract-client.service"

export function listCreditCards(
  query: ListCreditCardsQuery = {},
): Promise<ListCreditCardsResult> {
  return requestContract(creditCardsEndpoints.list, { query })
}

export function createCreditCard(
  input: CreateCreditCardInput,
): Promise<CreateCreditCardResult> {
  return requestContract(creditCardsEndpoints.create, { body: input })
}

export function getCreditCard(id: string): Promise<GetCreditCardResult> {
  return requestContract(creditCardsEndpoints.get, { params: { id } })
}

export function updateCreditCard(
  id: string,
  input: UpdateCreditCardInput,
): Promise<UpdateCreditCardResult> {
  return requestContract(creditCardsEndpoints.update, {
    params: { id },
    body: input,
  })
}

export function deleteCreditCard(id: string): Promise<DeleteCreditCardResult> {
  return requestContract(creditCardsEndpoints.delete, { params: { id } })
}

export function listCreditCardCycles(
  id: string,
  query: ListCreditCardCyclesQuery = {},
): Promise<ListCreditCardCyclesResult> {
  return requestContract(creditCardsEndpoints.cycles, { params: { id }, query })
}

export function getCreditCardCycle(
  id: string,
  cycleId: string,
): Promise<GetCreditCardCycleResult> {
  return requestContract(creditCardsEndpoints.getCycle, {
    params: { id, cycleId },
  })
}

export function updateCreditCardCycle(
  id: string,
  cycleId: string,
  input: UpdateCreditCardCycleInput,
): Promise<UpdateCreditCardCycleResult> {
  return requestContract(creditCardsEndpoints.updateCycle, {
    params: { id, cycleId },
    body: input,
  })
}

export function createCreditCardPurchase(
  id: string,
  input: CreateCreditCardPurchaseInput,
): Promise<CreateCreditCardPurchaseResult> {
  return requestContract(creditCardsEndpoints.createPurchase, {
    params: { id },
    body: input,
  })
}

export function getCreditCardPurchase(
  id: string,
  purchaseId: string,
): Promise<GetCreditCardPurchaseResult> {
  return requestContract(creditCardsEndpoints.getPurchase, {
    params: { id, purchaseId },
  })
}

export function updateCreditCardPurchase(
  id: string,
  purchaseId: string,
  input: UpdateCreditCardPurchaseInput,
): Promise<UpdateCreditCardPurchaseResult> {
  return requestContract(creditCardsEndpoints.updatePurchase, {
    params: { id, purchaseId },
    body: input,
  })
}

export function deleteCreditCardPurchase(
  id: string,
  purchaseId: string,
): Promise<DeleteCreditCardPurchaseResult> {
  return requestContract(creditCardsEndpoints.deletePurchase, {
    params: { id, purchaseId },
  })
}

export function createCreditCardPayment(
  id: string,
  input: CreateCreditCardPaymentInput,
): Promise<CreateCreditCardPaymentResult> {
  return requestContract(creditCardsEndpoints.createPayment, {
    params: { id },
    body: input,
  })
}

export function getCreditCardPayment(
  id: string,
  paymentId: string,
): Promise<GetCreditCardPaymentResult> {
  return requestContract(creditCardsEndpoints.getPayment, {
    params: { id, paymentId },
  })
}

export function updateCreditCardPayment(
  id: string,
  paymentId: string,
  input: UpdateCreditCardPaymentInput,
): Promise<UpdateCreditCardPaymentResult> {
  return requestContract(creditCardsEndpoints.updatePayment, {
    params: { id, paymentId },
    body: input,
  })
}

export function deleteCreditCardPayment(
  id: string,
  paymentId: string,
): Promise<DeleteCreditCardPaymentResult> {
  return requestContract(creditCardsEndpoints.deletePayment, {
    params: { id, paymentId },
  })
}

export function getCreditCardForecast(
  id: string,
  query: CreditCardForecastQuery = {},
): Promise<GetCreditCardForecastResult> {
  return requestContract(creditCardsEndpoints.forecast, {
    params: { id },
    query,
  })
}
