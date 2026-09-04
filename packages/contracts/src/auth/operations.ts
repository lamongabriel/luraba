import type { EndpointResult } from "../api.js";
import type { authEndpoints } from "./endpoints.js";
import type { UpdateUserPreferencesInput } from "./requests.js";

export type { UpdateUserPreferencesInput };
export type GetAuthProvidersResult = EndpointResult<typeof authEndpoints.providers>;
export type GetCurrentUserResult = EndpointResult<typeof authEndpoints.me>;
export type GetUserPreferencesResult = EndpointResult<typeof authEndpoints.preferences>;
export type UpdateUserPreferencesResult = EndpointResult<typeof authEndpoints.updatePreferences>;
