import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import { withApiMeta } from '@/shared/response';
import { ListTransactionsRequestQuerySchema } from './transactions.query';
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
  query: ListTransactionsRequestQuerySchema,
  response: ListTransactionsResponseSchema,
  handle: async ({ household, query }) => {
    const result = await transactionsService.listTransactions(household, query);
    return withApiMeta(result.data, result.meta);
  },
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
