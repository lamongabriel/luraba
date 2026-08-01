"use client"

import type {
  CreateAccountHttpBody,
  CreateAccountHttpResponse,
  GetAccountHttpResponse,
  ListAccountsHttpQuery,
  ListAccountsHttpResponse,
  ListAccountTransactionsHttpQuery,
  ListAccountTransactionsHttpResponse,
  UpdateAccountHttpBody,
  UpdateAccountHttpResponse,
} from "@/interfaces/http/accounts-http"
import {
  deleteApiResource,
  getApiData,
  getApiList,
  patchApiData,
  postApiData,
} from "@/services/api-client.service"
import { serializeHttpQuery } from "@/services/http-query"

export function listAccounts(
  query: ListAccountsHttpQuery = {},
): Promise<ListAccountsHttpResponse> {
  return getApiList("/accounts", { params: serializeHttpQuery(query) })
}

export function getAccount(id: string): Promise<GetAccountHttpResponse> {
  return getApiData(`/accounts/${id}`)
}

export function listAccountTransactions(
  accountId: string,
  query: ListAccountTransactionsHttpQuery = {},
): Promise<ListAccountTransactionsHttpResponse> {
  return getApiList(`/accounts/${accountId}/transactions`, {
    params: serializeHttpQuery(query),
  })
}

export function createAccount(
  body: CreateAccountHttpBody,
): Promise<CreateAccountHttpResponse> {
  return postApiData("/accounts", body)
}

export function updateAccount({
  id,
  body,
}: {
  id: string
  body: UpdateAccountHttpBody
}): Promise<UpdateAccountHttpResponse> {
  return patchApiData(`/accounts/${id}`, body)
}

export function deleteAccount(id: string): Promise<void> {
  return deleteApiResource(`/accounts/${id}`)
}
