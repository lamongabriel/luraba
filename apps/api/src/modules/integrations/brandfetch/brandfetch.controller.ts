import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import * as brandfetchService from './brandfetch.service';
import {
  DeleteBrandfetchIntegrationResponseSchema,
  UpdateBrandfetchIntegrationRequestBodySchema,
  UpdateBrandfetchIntegrationResponseSchema,
} from './brandfetch.types';

export const update = createHouseholdHandler({
  body: UpdateBrandfetchIntegrationRequestBodySchema,
  response: UpdateBrandfetchIntegrationResponseSchema,
  handle: ({ household, body }) => brandfetchService.updateBrandfetchIntegration(household, body),
});

export const remove = createHouseholdHandler({
  response: DeleteBrandfetchIntegrationResponseSchema,
  handle: ({ household }) => brandfetchService.deleteBrandfetchIntegration(household),
});
