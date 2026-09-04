import { defineEndpoint } from "../api.js";
import { netWorthQuerySchema } from "./requests.js";
import {
  netWorthAccountsSchema,
  netWorthBreakdownSchema,
  netWorthCashFlowSchema,
  netWorthCreditCardsSchema,
  netWorthHistorySchema,
  netWorthRecentActivitySchema,
  netWorthSummarySchema,
} from "./resource.js";
export const netWorthEndpoints = {
  summary: defineEndpoint({
    method: "get",
    path: "/networth/summary",
    query: netWorthQuerySchema,
    response: netWorthSummarySchema,
    status: 200,
  }),
  history: defineEndpoint({
    method: "get",
    path: "/networth/history",
    query: netWorthQuerySchema,
    response: netWorthHistorySchema,
    status: 200,
  }),
  accounts: defineEndpoint({
    method: "get",
    path: "/networth/accounts",
    query: netWorthQuerySchema,
    response: netWorthAccountsSchema,
    status: 200,
  }),
  cashFlow: defineEndpoint({
    method: "get",
    path: "/networth/cash-flow",
    query: netWorthQuerySchema,
    response: netWorthCashFlowSchema,
    status: 200,
  }),
  spendingBreakdown: defineEndpoint({
    method: "get",
    path: "/networth/spending-breakdown",
    query: netWorthQuerySchema,
    response: netWorthBreakdownSchema,
    status: 200,
  }),
  incomeBreakdown: defineEndpoint({
    method: "get",
    path: "/networth/income-breakdown",
    query: netWorthQuerySchema,
    response: netWorthBreakdownSchema,
    status: 200,
  }),
  recentActivity: defineEndpoint({
    method: "get",
    path: "/networth/recent-activity",
    query: netWorthQuerySchema,
    response: netWorthRecentActivitySchema,
    status: 200,
  }),
  creditCards: defineEndpoint({
    method: "get",
    path: "/networth/credit-cards",
    query: netWorthQuerySchema,
    response: netWorthCreditCardsSchema,
    status: 200,
  }),
} as const;
