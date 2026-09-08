"use client";

import {
  type CreateTransactionInput,
  type CreateTransactionResult,
  type DeleteTransactionResult,
  type ListTransactionsQuery,
  type ListTransactionsResult,
  type TransactionAnalyticsQuery,
  type TransactionAnalyticsResult,
  transactionsEndpoints,
  type UpcomingTransactionsQuery,
  type UpcomingTransactionsResult,
  type UpdateTransactionInput,
  type UpdateTransactionResult,
} from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export function listTransactions(
  query: ListTransactionsQuery = {},
): Promise<ListTransactionsResult> {
  return requestContract(transactionsEndpoints.list, { query });
}

export function getTransactionAnalytics(
  query: TransactionAnalyticsQuery = {},
): Promise<TransactionAnalyticsResult> {
  return requestContract(transactionsEndpoints.analytics, { query });
}

export function listUpcomingTransactions(
  query: UpcomingTransactionsQuery = {},
): Promise<UpcomingTransactionsResult> {
  return requestContract(transactionsEndpoints.upcoming, { query });
}

export function createTransaction(input: CreateTransactionInput): Promise<CreateTransactionResult> {
  return requestContract(transactionsEndpoints.create, { body: input });
}

export function updateTransaction(
  id: string,
  input: UpdateTransactionInput,
): Promise<UpdateTransactionResult> {
  return requestContract(transactionsEndpoints.update, {
    params: { id },
    body: input,
  });
}

export function deleteTransaction(id: string): Promise<DeleteTransactionResult> {
  return requestContract(transactionsEndpoints.delete, { params: { id } });
}
