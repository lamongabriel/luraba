import { integrationsEndpoints } from "@luraba/contracts/integrations";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import { withApiMeta } from "@/shared/response";
import * as integrationsService from "./integrations.service";

export const list = createHouseholdHandler({
  query: integrationsEndpoints.list.query,
  response: integrationsEndpoints.list.response,
  meta: integrationsEndpoints.list.meta,
  handle: async ({ household, query }) => {
    const result = await integrationsService.listIntegrations(household, query);
    return withApiMeta(result.data, result.meta);
  },
});
