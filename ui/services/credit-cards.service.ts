"use client"

import type {
  CreateCreditCardHttpBody,
  CreateCreditCardHttpResponse,
  CreateCreditCardPaymentHttpBody,
  CreateCreditCardPaymentHttpResponse,
  CreateCreditCardPurchaseHttpBody,
  CreateCreditCardPurchaseHttpResponse,
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
  UpdateCreditCardCycleHttpBody,
  UpdateCreditCardCycleHttpResponse,
  UpdateCreditCardHttpBody,
  UpdateCreditCardHttpResponse,
  UpdateCreditCardPaymentHttpBody,
  UpdateCreditCardPaymentHttpResponse,
  UpdateCreditCardPurchaseHttpBody,
  UpdateCreditCardPurchaseHttpResponse,
} from "@/interfaces/http/credit-cards-http"
import {
  deleteApiResource,
  getApiData,
  getApiList,
  patchApiData,
  postApiData,
} from "@/services/api-client.service"
import { serializeHttpQuery } from "@/services/http-query"

export function listCreditCards(
  query: ListCreditCardsHttpQuery = {},
): Promise<ListCreditCardsHttpResponse> {
  return getApiList("/credit-cards", { params: serializeHttpQuery(query) })
}

export function getCreditCard(id: string): Promise<GetCreditCardHttpResponse> {
  return getApiData(`/credit-cards/${id}`)
}

export function createCreditCard(
  body: CreateCreditCardHttpBody,
): Promise<CreateCreditCardHttpResponse> {
  return postApiData("/credit-cards", body)
}

export function updateCreditCard({
  creditCardId,
  body,
}: {
  creditCardId: string
  body: UpdateCreditCardHttpBody
}): Promise<UpdateCreditCardHttpResponse> {
  return patchApiData(`/credit-cards/${creditCardId}`, body)
}

export function deleteCreditCard(creditCardId: string): Promise<void> {
  return deleteApiResource(`/credit-cards/${creditCardId}`)
}

export function listCreditCardCycles(
  creditCardId: string,
  query: ListCreditCardCyclesHttpQuery = {},
): Promise<ListCreditCardCyclesHttpResponse> {
  return getApiList(`/credit-cards/${creditCardId}/cycles`, {
    params: serializeHttpQuery(query),
  })
}

export function getCreditCardCycle({
  creditCardId,
  cycleId,
}: {
  creditCardId: string
  cycleId: string
}): Promise<GetCreditCardCycleHttpResponse> {
  return getApiData(`/credit-cards/${creditCardId}/cycles/${cycleId}`)
}

export function updateCreditCardCycle({
  creditCardId,
  cycleId,
  body,
}: {
  creditCardId: string
  cycleId: string
  body: UpdateCreditCardCycleHttpBody
}): Promise<UpdateCreditCardCycleHttpResponse> {
  return patchApiData(`/credit-cards/${creditCardId}/cycles/${cycleId}`, body)
}

export function getCreditCardPurchase({
  creditCardId,
  purchaseId,
}: {
  creditCardId: string
  purchaseId: string
}): Promise<GetCreditCardPurchaseHttpResponse> {
  return getApiData(`/credit-cards/${creditCardId}/purchases/${purchaseId}`)
}

export function createCreditCardPurchase({
  creditCardId,
  body,
}: {
  creditCardId: string
  body: CreateCreditCardPurchaseHttpBody
}): Promise<CreateCreditCardPurchaseHttpResponse> {
  return postApiData(`/credit-cards/${creditCardId}/purchases`, body)
}

export function updateCreditCardPurchase({
  creditCardId,
  purchaseId,
  body,
}: {
  creditCardId: string
  purchaseId: string
  body: UpdateCreditCardPurchaseHttpBody
}): Promise<UpdateCreditCardPurchaseHttpResponse> {
  return patchApiData(
    `/credit-cards/${creditCardId}/purchases/${purchaseId}`,
    body,
  )
}

export function deleteCreditCardPurchase({
  creditCardId,
  purchaseId,
}: {
  creditCardId: string
  purchaseId: string
}): Promise<void> {
  return deleteApiResource(
    `/credit-cards/${creditCardId}/purchases/${purchaseId}`,
  )
}

export function getCreditCardPayment({
  creditCardId,
  paymentId,
}: {
  creditCardId: string
  paymentId: string
}): Promise<GetCreditCardPaymentHttpResponse> {
  return getApiData(`/credit-cards/${creditCardId}/payments/${paymentId}`)
}

export function createCreditCardPayment({
  creditCardId,
  body,
}: {
  creditCardId: string
  body: CreateCreditCardPaymentHttpBody
}): Promise<CreateCreditCardPaymentHttpResponse> {
  return postApiData(`/credit-cards/${creditCardId}/payments`, body)
}

export function updateCreditCardPayment({
  creditCardId,
  paymentId,
  body,
}: {
  creditCardId: string
  paymentId: string
  body: UpdateCreditCardPaymentHttpBody
}): Promise<UpdateCreditCardPaymentHttpResponse> {
  return patchApiData(
    `/credit-cards/${creditCardId}/payments/${paymentId}`,
    body,
  )
}

export function deleteCreditCardPayment({
  creditCardId,
  paymentId,
}: {
  creditCardId: string
  paymentId: string
}): Promise<void> {
  return deleteApiResource(
    `/credit-cards/${creditCardId}/payments/${paymentId}`,
  )
}

export function getCreditCardForecast(
  creditCardId: string,
  query: GetCreditCardForecastHttpQuery = {},
): Promise<GetCreditCardForecastHttpResponse> {
  return getApiData(`/credit-cards/${creditCardId}/forecast`, {
    params: serializeHttpQuery(query),
  })
}
