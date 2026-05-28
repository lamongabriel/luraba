import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import * as accountsService from './accounts.service';
import {
  CreateAccountRequestBodySchema,
  CreateAccountResponseSchema,
  GetAccountDetailsRequestParamsSchema,
  GetAccountDetailsResponseSchema,
  ListAccountsResponseSchema,
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
