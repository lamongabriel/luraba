"use client"

import type {
  CreateMerchantHttpBody,
  CreateMerchantHttpResponse,
  ListMerchantsHttpQuery,
  ListMerchantsHttpResponse,
  UpdateMerchantHttpBody,
  UpdateMerchantHttpResponse,
} from "@/interfaces/http/merchants-http"
import {
  deleteApiResource,
  getApiList,
  patchApiData,
  postApiData,
} from "@/services/api-client.service"
import { serializeHttpQuery } from "@/services/http-query"

export function listMerchants(
  query: ListMerchantsHttpQuery = {},
): Promise<ListMerchantsHttpResponse> {
  return getApiList("/merchants", { params: serializeHttpQuery(query) })
}

export function createMerchant(
  body: CreateMerchantHttpBody,
): Promise<CreateMerchantHttpResponse> {
  return postApiData("/merchants", body)
}

export function updateMerchant({
  id,
  body,
}: {
  id: string
  body: UpdateMerchantHttpBody
}): Promise<UpdateMerchantHttpResponse> {
  return patchApiData(`/merchants/${id}`, body)
}

export function deleteMerchant(id: string): Promise<void> {
  return deleteApiResource(`/merchants/${id}`)
}
