import type { EndpointResult } from "../api.js";
import type { healthEndpoints } from "./endpoints.js";

export type GetHealthResult = EndpointResult<typeof healthEndpoints.get>;
