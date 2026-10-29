"use client";

import {
  budgetsEndpoints,
  type GetMonthlyBudgetQuery,
  type GetMonthlyBudgetResult,
  type ReplaceMonthlyBudgetInput,
  type ReplaceMonthlyBudgetResult,
  type UpdateBudgetMonthSettingsInput,
  type UpdateBudgetMonthSettingsResult,
} from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export const getMonthlyBudget = (
  month: string,
  query: GetMonthlyBudgetQuery = {},
): Promise<GetMonthlyBudgetResult> =>
  requestContract(budgetsEndpoints.getMonth, { params: { month }, query });

export const replaceMonthlyBudget = (
  month: string,
  input: ReplaceMonthlyBudgetInput,
): Promise<ReplaceMonthlyBudgetResult> =>
  requestContract(budgetsEndpoints.replaceMonth, { params: { month }, body: input });

export const updateBudgetMonthSettings = (
  month: string,
  input: UpdateBudgetMonthSettingsInput,
): Promise<UpdateBudgetMonthSettingsResult> =>
  requestContract(budgetsEndpoints.updateMonthSettings, { params: { month }, body: input });
