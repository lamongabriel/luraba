"use client";

import {
  accountsEndpoints,
  type CreateAccountInput,
  type CreateAccountResult,
  type DeleteAccountResult,
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

export function deleteAccount(id: string): Promise<DeleteAccountResult> {
  return requestContract(accountsEndpoints.delete, { params: { id } });
}
