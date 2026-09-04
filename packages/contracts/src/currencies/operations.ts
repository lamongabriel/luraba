import type { EndpointResult } from "../api.js";
import type { currenciesEndpoints } from "./endpoints.js";
import type { GetCurrencyRateQuery, ListCurrenciesQuery } from "./requests.js";

export type { GetCurrencyRateQuery, ListCurrenciesQuery };
export type ListCurrenciesResult = EndpointResult<typeof currenciesEndpoints.list>;
export type GetCurrencyRateResult = EndpointResult<typeof currenciesEndpoints.rate>;
