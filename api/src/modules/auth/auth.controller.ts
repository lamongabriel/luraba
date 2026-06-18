import { createAuthenticatedHandler } from '@/shared/controllers/authenticated.controller';
import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import * as authService from './auth.service';
import {
  GetMeResponseSchema,
  GetMyPreferencesResponseSchema,
  UpdateMyPreferencesRequestBodySchema,
  UpdateMyPreferencesResponseSchema,
} from './auth.types';

export const me = createHouseholdHandler({
  response: GetMeResponseSchema,
  handle: ({ household }) => authService.getMe(household.userId, household.householdId),
});

export const getMyPreferences = createAuthenticatedHandler({
  response: GetMyPreferencesResponseSchema,
  handle: ({ user }) => authService.getMyPreferences(user.id),
});

export const updateMyPreferences = createAuthenticatedHandler({
  body: UpdateMyPreferencesRequestBodySchema,
  response: UpdateMyPreferencesResponseSchema,
  handle: ({ user, body }) => authService.updateMyPreferences(user.id, body),
});
