import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import * as integrationsService from './integrations.service';
import { ListIntegrationsResponseSchema } from './integrations.types';

export const list = createHouseholdHandler({
  response: ListIntegrationsResponseSchema,
  handle: ({ household }) => integrationsService.listIntegrations(household),
});
