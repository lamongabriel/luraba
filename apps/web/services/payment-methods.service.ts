"use client"

import type {
  CreatePaymentMethodHttpBody,
  CreatePaymentMethodHttpResponse,
  ListPaymentMethodsHttpQuery,
  ListPaymentMethodsHttpResponse,
  UpdatePaymentMethodHttpBody,
  UpdatePaymentMethodHttpResponse,
} from "@/interfaces/http/payment-methods-http"
import {
  deleteApiResource,
  getApiList,
  patchApiData,
  postApiData,
} from "@/services/api-client.service"
import { serializeHttpQuery } from "@/services/http-query"

export function listPaymentMethods(
  query: ListPaymentMethodsHttpQuery = {},
): Promise<ListPaymentMethodsHttpResponse> {
  return getApiList("/payment-methods", { params: serializeHttpQuery(query) })
}

export function createPaymentMethod(
  body: CreatePaymentMethodHttpBody,
): Promise<CreatePaymentMethodHttpResponse> {
  return postApiData("/payment-methods", body)
}

export function updatePaymentMethod({
  id,
  body,
}: {
  id: string
  body: UpdatePaymentMethodHttpBody
}): Promise<UpdatePaymentMethodHttpResponse> {
  return patchApiData(`/payment-methods/${id}`, body)
}

export function deletePaymentMethod(id: string): Promise<void> {
  return deleteApiResource(`/payment-methods/${id}`)
}
