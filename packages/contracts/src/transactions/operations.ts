import type { EndpointParams, EndpointResult } from "../api.js";
import type { transactionsEndpoints } from "./endpoints.js";

export type {
  CreateTransactionInput,
  ListAccountTransactionsQuery,
  ListTransactionsQuery,
  TransactionAnalyticsQuery,
  UpcomingTransactionsQuery,
  UpdateTransactionInput,
} from "./requests.js";
export type UpdateTransactionParams = EndpointParams<typeof transactionsEndpoints.update>;
export type DeleteTransactionParams = EndpointParams<typeof transactionsEndpoints.delete>;
export type ListTransactionsResult = EndpointResult<typeof transactionsEndpoints.list>;
export type TransactionAnalyticsResult = EndpointResult<typeof transactionsEndpoints.analytics>;
export type UpcomingTransactionsResult = EndpointResult<typeof transactionsEndpoints.upcoming>;
export type CreateTransactionResult = EndpointResult<typeof transactionsEndpoints.create>;
export type UpdateTransactionResult = EndpointResult<typeof transactionsEndpoints.update>;
export type DeleteTransactionResult = EndpointResult<typeof transactionsEndpoints.delete>;
