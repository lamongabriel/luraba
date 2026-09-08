"use client";
import {
  currenciesEndpoints,
  type GetCurrencyRateQuery,
  type GetCurrencyRateResult,
  type ListCurrenciesQuery,
  type ListCurrenciesResult,
} from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export function listCurrencies(query: ListCurrenciesQuery = {}): Promise<ListCurrenciesResult> {
  return requestContract(currenciesEndpoints.list, { query });
}

export function getCurrencyRate(query: GetCurrencyRateQuery): Promise<GetCurrencyRateResult> {
  return requestContract(currenciesEndpoints.rate, { query });
}
