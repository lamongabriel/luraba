import type { EndpointResult } from "../api.js";
import type { referenceDataEndpoints } from "./endpoints.js";

export type GetLocationOptionsResult = EndpointResult<typeof referenceDataEndpoints.getLocations>;
