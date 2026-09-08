"use client";
import {
  budgetsEndpoints,
  type GetMonthlyBudgetQuery,
  type GetMonthlyBudgetResult,
  type ReplaceMonthlyBudgetInput,
  type ReplaceMonthlyBudgetResult,
} from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export function getMonthlyBudget(
  month: string,
  query: GetMonthlyBudgetQuery = {},
): Promise<GetMonthlyBudgetResult> {
  return requestContract(budgetsEndpoints.getMonth, {
    params: { month },
    query,
  });
}

export function replaceMonthlyBudget(
  month: string,
  input: ReplaceMonthlyBudgetInput,
): Promise<ReplaceMonthlyBudgetResult> {
  return requestContract(budgetsEndpoints.replaceMonth, {
    params: { month },
    body: input,
  });
}
