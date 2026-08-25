import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import { withApiMeta } from '@/shared/response';
import {
  ListAccountsRequestQuerySchema,
  ListAccountTransactionsRequestQuerySchema,
} from './accounts.query';
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
  query: ListAccountsRequestQuerySchema,
  response: ListAccountsResponseSchema,
  handle: async ({ household, query }) => {
    const result = await accountsService.listAccounts(household, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const details = createHouseholdHandler({
  params: GetAccountDetailsRequestParamsSchema,
  response: GetAccountDetailsResponseSchema,
  handle: ({ household, params }) => accountsService.getAccountDetails(household, params.id),
});

export const listTransactions = createHouseholdHandler({
  params: ListAccountTransactionsRequestParamsSchema,
  query: ListAccountTransactionsRequestQuerySchema,
  response: ListAccountTransactionsResponseSchema,
  handle: async ({ household, params, query }) => {
    const result = await accountsService.listAccountTransactions(household, params.id, query);
    return withApiMeta(result.data, result.meta);
  },
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
