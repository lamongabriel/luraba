import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import { getTodayInTimezone } from '@/shared/lib/date';
import { withApiMeta } from '@/shared/response';
import * as analyticsService from './transactions.analytics.service';
import {
  ListTransactionsRequestQuerySchema,
  TransactionFilterQuerySchema,
} from './transactions.query';
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
import * as upcomingService from './transactions.upcoming.service';

export const list = createHouseholdHandler({
  query: ListTransactionsRequestQuerySchema,
  response: ListTransactionsResponseSchema,
  handle: async ({ household, query }) => {
    const result = await transactionsService.listTransactions(household, query, {
      maxPostedDate: getTodayInTimezone(household.timezone).toISOString().slice(0, 10),
    });
    return withApiMeta(result.data, result.meta);
  },
});

export const analytics = createHouseholdHandler({
  query: TransactionFilterQuerySchema,
  response: analyticsService.transactionAnalyticsResponseSchema,
  handle: ({ household, query }) => analyticsService.getAnalytics(household, query),
});

export const upcoming = createHouseholdHandler({
  query: upcomingService.upcomingTransactionsQuerySchema,
  response: upcomingService.upcomingTransactionSchema.array(),
  handle: async ({ household, query }) => {
    const result = await upcomingService.listUpcomingTransactions(household, query);
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
