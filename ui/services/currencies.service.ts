"use client"

import type {
  GetCurrencyRateHttpQuery,
  GetCurrencyRateHttpResponse,
  ListCurrenciesHttpQuery,
  ListCurrenciesHttpResponse,
} from "@/interfaces/http/currencies-http"
import { getApiData, getApiList } from "@/services/api-client.service"
import { serializeHttpQuery } from "@/services/http-query"

export function listCurrencies(
  query: ListCurrenciesHttpQuery = {},
): Promise<ListCurrenciesHttpResponse> {
  return getApiList("/currencies", { params: serializeHttpQuery(query) })
}

export function getCurrencyRate(
  query: GetCurrencyRateHttpQuery,
): Promise<GetCurrencyRateHttpResponse> {
  return getApiData("/currencies/rate", { params: serializeHttpQuery(query) })
}
