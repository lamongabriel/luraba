import type { EndpointParams, EndpointResult } from "../api.js";
import type { accountsEndpoints } from "./endpoints.js";

export type { ListAccountTransactionsQuery } from "../transactions/requests.js";
export type { CreateAccountInput, ListAccountsQuery, UpdateAccountInput } from "./requests.js";
export type GetAccountParams = EndpointParams<typeof accountsEndpoints.get>;
export type ListAccountTransactionsParams = EndpointParams<typeof accountsEndpoints.transactions>;
export type UpdateAccountParams = EndpointParams<typeof accountsEndpoints.update>;
export type DeleteAccountParams = EndpointParams<typeof accountsEndpoints.delete>;
export type ListAccountsResult = EndpointResult<typeof accountsEndpoints.list>;
export type ListAccountTransactionsResult = EndpointResult<typeof accountsEndpoints.transactions>;
export type GetAccountResult = EndpointResult<typeof accountsEndpoints.get>;
export type CreateAccountResult = EndpointResult<typeof accountsEndpoints.create>;
export type UpdateAccountResult = EndpointResult<typeof accountsEndpoints.update>;
export type DeleteAccountResult = EndpointResult<typeof accountsEndpoints.delete>;
