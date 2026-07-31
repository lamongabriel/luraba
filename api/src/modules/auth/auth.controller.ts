import * as householdsService from '@/modules/households/households.service';
import { createAuthenticatedHandler } from '@/shared/controllers/authenticated.controller';
import { createHandler } from '@/shared/controllers/controller';
import * as authService from './auth.service';
import {
  GetAuthProvidersResponseSchema,
  GetMeResponseSchema,
  GetMyPreferencesResponseSchema,
  UpdateMyPreferencesRequestBodySchema,
  UpdateMyPreferencesResponseSchema,
} from './auth.types';

export const getProviders = createHandler({
  response: GetAuthProvidersResponseSchema,
  handle: async () => authService.getProviders(),
});

export const me = createAuthenticatedHandler({
  response: GetMeResponseSchema,
  handle: async ({ req, user }) => {
    const rawHouseholdId = req.headers['x-household-id'];
    const selectedHouseholdId = Array.isArray(rawHouseholdId) ? rawHouseholdId[0] : rawHouseholdId;
    const householdId =
      selectedHouseholdId?.trim() || (await householdsService.resolveHouseholdIdForUser(user.id));

    return authService.getMe(user.id, householdId);
  },
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
