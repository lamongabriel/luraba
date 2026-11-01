import type { EndpointResult } from "../api.js";
import type { apiKeysEndpoints } from "./endpoints.js";

export type ListApiKeysResult = EndpointResult<typeof apiKeysEndpoints.list>;
export type CreateApiKeyResult = EndpointResult<typeof apiKeysEndpoints.create>;
export type UpdateApiKeyResult = EndpointResult<typeof apiKeysEndpoints.update>;
