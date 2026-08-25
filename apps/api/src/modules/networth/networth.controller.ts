import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import * as service from './networth.service';
import {
  NetWorthAccountsSchema,
  NetWorthBreakdownSchema,
  NetWorthCashFlowSchema,
  NetWorthCreditCardsSchema,
  NetWorthHistorySchema,
  NetWorthQuerySchema,
  NetWorthRecentActivitySchema,
  NetWorthSummarySchema,
} from './networth.types';

export const summary = createHouseholdHandler({
  query: NetWorthQuerySchema,
  response: NetWorthSummarySchema,
  handle: ({ household, query }) => service.getSummary(household, query),
});
export const history = createHouseholdHandler({
  query: NetWorthQuerySchema,
  response: NetWorthHistorySchema,
  handle: ({ household, query }) => service.getHistory(household, query),
});
export const accounts = createHouseholdHandler({
  query: NetWorthQuerySchema,
  response: NetWorthAccountsSchema,
  handle: ({ household, query }) => service.getAccounts(household, query),
});
export const cashFlow = createHouseholdHandler({
  query: NetWorthQuerySchema,
  response: NetWorthCashFlowSchema,
  handle: ({ household, query }) => service.getCashFlow(household, query),
});
export const spendingBreakdown = createHouseholdHandler({
  query: NetWorthQuerySchema,
  response: NetWorthBreakdownSchema,
  handle: ({ household, query }) => service.getSpendingBreakdown(household, query),
});
export const incomeBreakdown = createHouseholdHandler({
  query: NetWorthQuerySchema,
  response: NetWorthBreakdownSchema,
  handle: ({ household, query }) => service.getIncomeBreakdown(household, query),
});
export const recentActivity = createHouseholdHandler({
  query: NetWorthQuerySchema,
  response: NetWorthRecentActivitySchema,
  handle: ({ household, query }) => service.getRecentActivity(household, query),
});
export const creditCards = createHouseholdHandler({
  query: NetWorthQuerySchema,
  response: NetWorthCreditCardsSchema,
  handle: ({ household, query }) => service.getCreditCards(household, query),
});
