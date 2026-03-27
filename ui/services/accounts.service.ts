import { lurabaApiClient } from "@/api/luraba-api";
import type {
  CreateAccountHttpParams,
  CreateAccountHttpResponse,
  GetAccountHistoryHttpResponse,
  ListAccountsHttpResponse,
} from "@/interfaces/http/accounts";

export const listAccounts = async (): Promise<ListAccountsHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.get<ListAccountsHttpResponse>("/accounts");
  return data.data;
};

export const getAccountHistory = async (
  accountId: string,
): Promise<GetAccountHistoryHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.get<GetAccountHistoryHttpResponse>(`/accounts/${accountId}/history`);
  return data.data;
};

export const createAccount = async (
  params: CreateAccountHttpParams,
): Promise<CreateAccountHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.post<CreateAccountHttpResponse>("/accounts", params);
  return data.data;
};
