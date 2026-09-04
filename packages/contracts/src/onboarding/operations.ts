import type { EndpointResult } from "../api.js";
import type { onboardingEndpoints } from "./endpoints.js";

export type GetOnboardingOptionsResult = EndpointResult<typeof onboardingEndpoints.getOptions>;
