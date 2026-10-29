import type { EndpointResult } from "../api.js";
import type { splitsEndpoints } from "./endpoints.js";

export type ListSplitsResult = EndpointResult<typeof splitsEndpoints.list>;
export type GetSplitResult = EndpointResult<typeof splitsEndpoints.get>;
export type SplitInstallmentResult = EndpointResult<typeof splitsEndpoints.linkInstallment>;
