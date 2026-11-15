"use client";

import {
  type CreateTransactionInput,
  type CreateTransactionResult,
  type DeleteTransactionResult,
  type LinkRefundInput,
  type ListTransactionsQuery,
  type ListTransactionsResult,
  type Transaction,
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

export function getTransaction(id: string): Promise<Transaction> {
  return requestContract(transactionsEndpoints.get, { params: { id } });
}

/** Links a money-back row to the purchase it belongs to, or unlinks it with `null`. */
export function linkRefund(id: string, body: LinkRefundInput): Promise<Transaction> {
  return requestContract(transactionsEndpoints.linkRefund, { params: { id }, body });
}
