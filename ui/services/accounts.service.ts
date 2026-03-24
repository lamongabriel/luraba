import { lurabaApiClient } from "@/api/luraba-api";
import type { ListAccountsHttpResponse } from "@/interfaces/http/accounts";

export const listAccounts = async (): Promise<ListAccountsHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.get<ListAccountsHttpResponse>("/accounts");
  return data.data;
};
