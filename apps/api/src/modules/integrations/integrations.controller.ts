import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import { withApiMeta } from '@/shared/response';
import { ListIntegrationsRequestQuerySchema } from './integrations.query';
import * as integrationsService from './integrations.service';
import { ListIntegrationsResponseSchema } from './integrations.types';

export const list = createHouseholdHandler({
  query: ListIntegrationsRequestQuerySchema,
  response: ListIntegrationsResponseSchema,
  handle: async ({ household, query }) => {
    const result = await integrationsService.listIntegrations(household, query);
    return withApiMeta(result.data, result.meta);
  },
});
