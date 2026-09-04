import { accountsEndpoints } from '@luraba/contracts';
import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import { withApiMeta } from '@/shared/response';
import * as accountsService from './accounts.service';

export const create = createHouseholdHandler({
  body: accountsEndpoints.create.body,
  response: accountsEndpoints.create.response,
  handle: ({ household, body }) => accountsService.createAccount(household, body),
  status: 'created',
});

export const list = createHouseholdHandler({
  query: accountsEndpoints.list.query,
  response: accountsEndpoints.list.response,
  meta: accountsEndpoints.list.meta,
  handle: async ({ household, query }) => {
    const result = await accountsService.listAccounts(household, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const details = createHouseholdHandler({
  params: accountsEndpoints.get.params,
  response: accountsEndpoints.get.response,
  handle: ({ household, params }) => accountsService.getAccountDetails(household, params.id),
});

export const listTransactions = createHouseholdHandler({
  params: accountsEndpoints.transactions.params,
  query: accountsEndpoints.transactions.query,
  response: accountsEndpoints.transactions.response,
  meta: accountsEndpoints.transactions.meta,
  handle: async ({ household, params, query }) => {
    const result = await accountsService.listAccountTransactions(household, params.id, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const update = createHouseholdHandler({
  params: accountsEndpoints.update.params,
  body: accountsEndpoints.update.body,
  response: accountsEndpoints.update.response,
  handle: ({ household, params, body }) =>
    accountsService.updateAccount(household, params.id, body),
});

export const deleteAccount = createHouseholdHandler({
  params: accountsEndpoints.delete.params,
  status: 'no-content',
  handle: ({ household, params }) => accountsService.deleteAccount(household, params.id),
});
