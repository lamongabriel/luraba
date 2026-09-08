import { integrationsEndpoints } from "@luraba/contracts/integrations";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import * as brandfetchService from "./brandfetch.service";

export const update = createHouseholdHandler({
  body: integrationsEndpoints.updateBrandfetch.body,
  response: integrationsEndpoints.updateBrandfetch.response,
  handle: ({ household, body }) => brandfetchService.updateBrandfetchIntegration(household, body),
});

export const remove = createHouseholdHandler({
  response: integrationsEndpoints.deleteBrandfetch.response,
  handle: ({ household }) => brandfetchService.deleteBrandfetchIntegration(household),
});
