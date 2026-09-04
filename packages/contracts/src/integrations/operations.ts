import type { EndpointResult } from "../api.js";
import type { integrationsEndpoints } from "./endpoints.js";
import type { ListIntegrationsQuery, UpdateBrandfetchIntegrationInput } from "./requests.js";

export type { ListIntegrationsQuery, UpdateBrandfetchIntegrationInput };
export type ListIntegrationsResult = EndpointResult<typeof integrationsEndpoints.list>;
export type UpdateBrandfetchIntegrationResult = EndpointResult<
  typeof integrationsEndpoints.updateBrandfetch
>;
export type DeleteBrandfetchIntegrationResult = EndpointResult<
  typeof integrationsEndpoints.deleteBrandfetch
>;
