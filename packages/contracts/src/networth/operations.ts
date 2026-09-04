import type { EndpointResult } from "../api.js";
import type { netWorthEndpoints } from "./endpoints.js";
import type { NetWorthQuery } from "./requests.js";

export type { NetWorthQuery };
export type GetNetWorthSummaryResult = EndpointResult<typeof netWorthEndpoints.summary>;
export type GetNetWorthHistoryResult = EndpointResult<typeof netWorthEndpoints.history>;
export type GetNetWorthAccountsResult = EndpointResult<typeof netWorthEndpoints.accounts>;
export type GetNetWorthCashFlowResult = EndpointResult<typeof netWorthEndpoints.cashFlow>;
export type GetNetWorthSpendingBreakdownResult = EndpointResult<
  typeof netWorthEndpoints.spendingBreakdown
>;
export type GetNetWorthIncomeBreakdownResult = EndpointResult<
  typeof netWorthEndpoints.incomeBreakdown
>;
export type GetNetWorthRecentActivityResult = EndpointResult<
  typeof netWorthEndpoints.recentActivity
>;
export type GetNetWorthCreditCardsResult = EndpointResult<typeof netWorthEndpoints.creditCards>;
