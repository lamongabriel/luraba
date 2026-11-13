import type { EndpointParams, EndpointResult } from "../api.js";
import type { accountsEndpoints } from "./endpoints.js";

export type { ListAccountTransactionsQuery } from "../transactions/requests.js";
export type {
  AccountInsightsQuery,
  CreateAccountInput,
  ListAccountsQuery,
  UpdateAccountInput,
} from "./requests.js";
export type GetAccountParams = EndpointParams<typeof accountsEndpoints.get>;
export type ListAccountTransactionsParams = EndpointParams<typeof accountsEndpoints.transactions>;
export type UpdateAccountParams = EndpointParams<typeof accountsEndpoints.update>;
export type ArchiveAccountParams = EndpointParams<typeof accountsEndpoints.archive>;
export type ArchiveAccountResult = EndpointResult<typeof accountsEndpoints.archive>;
export type UnarchiveAccountParams = EndpointParams<typeof accountsEndpoints.unarchive>;
export type UnarchiveAccountResult = EndpointResult<typeof accountsEndpoints.unarchive>;
export type DeleteAccountParams = EndpointParams<typeof accountsEndpoints.delete>;
export type ListAccountsResult = EndpointResult<typeof accountsEndpoints.list>;
export type ListAccountTransactionsResult = EndpointResult<typeof accountsEndpoints.transactions>;
export type GetAccountResult = EndpointResult<typeof accountsEndpoints.get>;
export type CreateAccountResult = EndpointResult<typeof accountsEndpoints.create>;
export type UpdateAccountResult = EndpointResult<typeof accountsEndpoints.update>;
export type DeleteAccountResult = EndpointResult<typeof accountsEndpoints.delete>;
export type GetAccountInsightsParams = EndpointParams<typeof accountsEndpoints.insights>;
export type GetAccountInsightsResult = EndpointResult<typeof accountsEndpoints.insights>;
