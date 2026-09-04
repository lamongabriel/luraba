import { netWorthEndpoints } from '@luraba/contracts/networth';
import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import * as service from './networth.service';

export const summary = createHouseholdHandler({
  query: netWorthEndpoints.summary.query,
  response: netWorthEndpoints.summary.response,
  handle: ({ household, query }) => service.getSummary(household, query),
});
export const history = createHouseholdHandler({
  query: netWorthEndpoints.history.query,
  response: netWorthEndpoints.history.response,
  handle: ({ household, query }) => service.getHistory(household, query),
});
export const accounts = createHouseholdHandler({
  query: netWorthEndpoints.accounts.query,
  response: netWorthEndpoints.accounts.response,
  handle: ({ household, query }) => service.getAccounts(household, query),
});
export const cashFlow = createHouseholdHandler({
  query: netWorthEndpoints.cashFlow.query,
  response: netWorthEndpoints.cashFlow.response,
  handle: ({ household, query }) => service.getCashFlow(household, query),
});
export const spendingBreakdown = createHouseholdHandler({
  query: netWorthEndpoints.spendingBreakdown.query,
  response: netWorthEndpoints.spendingBreakdown.response,
  handle: ({ household, query }) => service.getSpendingBreakdown(household, query),
});
export const incomeBreakdown = createHouseholdHandler({
  query: netWorthEndpoints.incomeBreakdown.query,
  response: netWorthEndpoints.incomeBreakdown.response,
  handle: ({ household, query }) => service.getIncomeBreakdown(household, query),
});
export const recentActivity = createHouseholdHandler({
  query: netWorthEndpoints.recentActivity.query,
  response: netWorthEndpoints.recentActivity.response,
  handle: ({ household, query }) => service.getRecentActivity(household, query),
});
export const creditCards = createHouseholdHandler({
  query: netWorthEndpoints.creditCards.query,
  response: netWorthEndpoints.creditCards.response,
  handle: ({ household, query }) => service.getCreditCards(household, query),
});
