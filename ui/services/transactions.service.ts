import { lurabaApiClient } from "@/api/luraba-api";
import type {
  CreateTransactionHttpParams,
  CreateTransactionHttpResponse,
  ListTransactionsHttpResponse,
} from "@/interfaces/http/transactions";

export const listTransactions = async (): Promise<ListTransactionsHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.get<ListTransactionsHttpResponse>("/transactions");
  return data.data;
};

export const createTransaction = async (
  params: CreateTransactionHttpParams,
): Promise<CreateTransactionHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.post<CreateTransactionHttpResponse>("/transactions", params);
  return data.data;
};
