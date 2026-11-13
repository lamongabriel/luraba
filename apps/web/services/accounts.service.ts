"use client";

import {
  type AccountInsightsQuery,
  accountsEndpoints,
  type CreateAccountInput,
  type CreateAccountResult,
  type DeleteAccountResult,
  type GetAccountInsightsResult,
  type GetAccountResult,
  type ListAccountsQuery,
  type ListAccountsResult,
  type ListAccountTransactionsQuery,
  type ListAccountTransactionsResult,
  type UpdateAccountInput,
  type UpdateAccountResult,
} from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export function listAccounts(query: ListAccountsQuery = {}): Promise<ListAccountsResult> {
  return requestContract(accountsEndpoints.list, { query });
}

export function getAccount(id: string): Promise<GetAccountResult> {
  return requestContract(accountsEndpoints.get, { params: { id } });
}

export function getAccountInsights(
  id: string,
  query: AccountInsightsQuery = {},
): Promise<GetAccountInsightsResult> {
  return requestContract(accountsEndpoints.insights, { params: { id }, query });
}

export function listAccountTransactions(
  id: string,
  query: ListAccountTransactionsQuery = {},
): Promise<ListAccountTransactionsResult> {
  return requestContract(accountsEndpoints.transactions, {
    params: { id },
    query,
  });
}

export function createAccount(input: CreateAccountInput): Promise<CreateAccountResult> {
  return requestContract(accountsEndpoints.create, { body: input });
}

export function updateAccount(id: string, input: UpdateAccountInput): Promise<UpdateAccountResult> {
  return requestContract(accountsEndpoints.update, {
    params: { id },
    body: input,
  });
}

/** Archives (hides, closes to new activity) or restores an account. */
export function setAccountArchived(id: string, archived: boolean): Promise<UpdateAccountResult> {
  return requestContract(archived ? accountsEndpoints.archive : accountsEndpoints.unarchive, {
    params: { id },
  });
}

export function deleteAccount(id: string): Promise<DeleteAccountResult> {
  return requestContract(accountsEndpoints.delete, { params: { id } });
}
