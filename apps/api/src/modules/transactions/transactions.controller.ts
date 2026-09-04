import { transactionsEndpoints } from '@luraba/contracts';
import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import { getTodayInTimezone } from '@/shared/lib/date';
import { withApiMeta } from '@/shared/response';
import * as analyticsService from './transactions.analytics.service';
import * as transactionsService from './transactions.service';
import * as upcomingService from './transactions.upcoming.service';

export const list = createHouseholdHandler({
  query: transactionsEndpoints.list.query,
  response: transactionsEndpoints.list.response,
  meta: transactionsEndpoints.list.meta,
  handle: async ({ household, query }) => {
    const result = await transactionsService.listTransactions(household, query, {
      maxPostedDate: getTodayInTimezone(household.timezone).toISOString().slice(0, 10),
    });
    return withApiMeta(result.data, result.meta);
  },
});

export const analytics = createHouseholdHandler({
  query: transactionsEndpoints.analytics.query,
  response: transactionsEndpoints.analytics.response,
  handle: ({ household, query }) => analyticsService.getAnalytics(household, query),
});

export const upcoming = createHouseholdHandler({
  query: transactionsEndpoints.upcoming.query,
  response: transactionsEndpoints.upcoming.response,
  meta: transactionsEndpoints.upcoming.meta,
  handle: async ({ household, query }) => {
    const result = await upcomingService.listUpcomingTransactions(household, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const create = createHouseholdHandler({
  body: transactionsEndpoints.create.body,
  response: transactionsEndpoints.create.response,
  handle: ({ household, body }) => transactionsService.createTransaction(household, body),
  status: 'created',
});

export const update = createHouseholdHandler({
  params: transactionsEndpoints.update.params,
  body: transactionsEndpoints.update.body,
  response: transactionsEndpoints.update.response,
  handle: ({ household, params, body }) =>
    transactionsService.updateTransaction(household, params.id, body),
});

export const deleteTransaction = createHouseholdHandler({
  params: transactionsEndpoints.delete.params,
  status: 'no-content',
  handle: ({ household, params }) => transactionsService.deleteTransaction(household, params.id),
});
