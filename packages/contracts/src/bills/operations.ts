import type { EndpointParams, EndpointResult } from "../api.js";
import type { billsEndpoints } from "./endpoints.js";

export type ListBillsResult = EndpointResult<typeof billsEndpoints.list>;
export type GetBillResult = EndpointResult<typeof billsEndpoints.get>;
export type BillForecastResult = EndpointResult<typeof billsEndpoints.forecast>;
export type ListBillOccurrencesResult = EndpointResult<typeof billsEndpoints.listOccurrences>;
export type BillOccurrenceResult = EndpointResult<typeof billsEndpoints.linkOccurrence>;
export type BillParams = EndpointParams<typeof billsEndpoints.get>;
export type BillOccurrenceParams = EndpointParams<typeof billsEndpoints.linkOccurrence>;
