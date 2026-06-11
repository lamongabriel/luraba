import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import * as accountsService from './accounts.service';
import {
  CreateAccountRequestBodySchema,
  CreateAccountResponseSchema,
  DeleteAccountRequestParamsSchema,
  GetAccountDetailsRequestParamsSchema,
  GetAccountDetailsResponseSchema,
  ListAccountsResponseSchema,
  ListAccountTransactionsRequestParamsSchema,
  ListAccountTransactionsResponseSchema,
  UpdateAccountRequestBodySchema,
  UpdateAccountRequestParamsSchema,
  UpdateAccountResponseSchema,
} from './accounts.types';

export const create = createHouseholdHandler({
  body: CreateAccountRequestBodySchema,
  response: CreateAccountResponseSchema,
  handle: ({ household, body }) => accountsService.createAccount(household, body),
  status: 'created',
});

export const list = createHouseholdHandler({
  response: ListAccountsResponseSchema,
  handle: ({ household }) => accountsService.listAccounts(household),
});

export const details = createHouseholdHandler({
  params: GetAccountDetailsRequestParamsSchema,
  response: GetAccountDetailsResponseSchema,
  handle: ({ household, params }) => accountsService.getAccountDetails(household, params.id),
});

export const listTransactions = createHouseholdHandler({
  params: ListAccountTransactionsRequestParamsSchema,
  response: ListAccountTransactionsResponseSchema,
  handle: ({ household, params }) => accountsService.listAccountTransactions(household, params.id),
});

export const update = createHouseholdHandler({
  params: UpdateAccountRequestParamsSchema,
  body: UpdateAccountRequestBodySchema,
  response: UpdateAccountResponseSchema,
  handle: ({ household, params, body }) =>
    accountsService.updateAccount(household, params.id, body),
});

export const deleteAccount = createHouseholdHandler({
  params: DeleteAccountRequestParamsSchema,
  status: 'no-content',
  handle: ({ household, params }) => accountsService.deleteAccount(household, params.id),
});
