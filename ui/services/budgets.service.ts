"use client"

import type {
  GetMonthlyBudgetHttpQuery,
  GetMonthlyBudgetHttpResponse,
  ReplaceMonthlyBudgetHttpBody,
  ReplaceMonthlyBudgetHttpResponse,
} from "@/interfaces/http/budgets-http"
import { getApiData, putApiData } from "@/services/api-client.service"
import { serializeHttpQuery } from "@/services/http-query"

export function getMonthlyBudget(
  month: string,
  query: GetMonthlyBudgetHttpQuery = {},
): Promise<GetMonthlyBudgetHttpResponse> {
  return getApiData(`/budgets/${month}`, { params: serializeHttpQuery(query) })
}

export function replaceMonthlyBudget({
  month,
  body,
}: {
  month: string
  body: ReplaceMonthlyBudgetHttpBody
}): Promise<ReplaceMonthlyBudgetHttpResponse> {
  return putApiData(`/budgets/${month}`, body)
}
