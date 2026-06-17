import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import * as transactionsService from './transactions.service';
import {
  CreateTransactionResponseSchema,
  createTransactionSchema,
  DeleteTransactionRequestParamsSchema,
  ListTransactionsResponseSchema,
  UpdateTransactionRequestBodySchema,
  UpdateTransactionRequestParamsSchema,
  UpdateTransactionResponseSchema,
} from './transactions.types';

export const list = createHouseholdHandler({
  response: ListTransactionsResponseSchema,
  handle: ({ household }) => transactionsService.listTransactions(household),
});

export const create = createHouseholdHandler({
  body: createTransactionSchema,
  response: CreateTransactionResponseSchema,
  handle: ({ household, body }) => transactionsService.createTransaction(household, body),
  status: 'created',
});

export const update = createHouseholdHandler({
  params: UpdateTransactionRequestParamsSchema,
  body: UpdateTransactionRequestBodySchema,
  response: UpdateTransactionResponseSchema,
  handle: ({ household, params, body }) =>
    transactionsService.updateTransaction(household, params.id, body),
});

export const deleteTransaction = createHouseholdHandler({
  params: DeleteTransactionRequestParamsSchema,
  status: 'no-content',
  handle: ({ household, params }) => transactionsService.deleteTransaction(household, params.id),
});
