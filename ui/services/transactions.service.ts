import { lurabaApiClient } from "@/api/luraba-api";
import type { ListTransactionsHttpResponse } from "@/interfaces/http/transactions";

export const listTransactions = async (): Promise<ListTransactionsHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.get<ListTransactionsHttpResponse>("/transactions");
  return data.data;
};
