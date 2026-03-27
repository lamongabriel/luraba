import { lurabaApiClient } from "@/api/luraba-api";
import type {
  GetBudgetHttpResponse,
  ReplaceBudgetHttpParams,
  ReplaceBudgetHttpResponse,
} from "@/interfaces/http/budgets";

export const getBudget = async (
  month: string,
  currencyCode?: string,
): Promise<GetBudgetHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.get<GetBudgetHttpResponse>(`/budgets/${month}`, {
    params: currencyCode ? { currencyCode } : undefined,
  });
  return data.data;
};

export const replaceBudget = async (
  month: string,
  params: ReplaceBudgetHttpParams,
): Promise<ReplaceBudgetHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.put<ReplaceBudgetHttpResponse>(`/budgets/${month}`, params);
  return data.data;
};
