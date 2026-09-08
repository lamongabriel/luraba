import { authEndpoints } from "@luraba/contracts/auth";
import * as householdsService from "@/modules/households/households.service";
import { createAuthenticatedHandler } from "@/shared/controllers/authenticated.controller";
import { createHandler } from "@/shared/controllers/controller";
import * as authService from "./auth.service";

export const getProviders = createHandler({
  response: authEndpoints.providers.response,
  handle: async () => authService.getProviders(),
});

export const me = createAuthenticatedHandler({
  response: authEndpoints.me.response,
  handle: async ({ req, user }) => {
    const rawHouseholdId = req.headers["x-household-id"];
    const selectedHouseholdId = Array.isArray(rawHouseholdId) ? rawHouseholdId[0] : rawHouseholdId;
    const householdId =
      selectedHouseholdId?.trim() || (await householdsService.resolveHouseholdIdForUser(user.id));

    return authService.getMe(user.id, householdId);
  },
});

export const getMyPreferences = createAuthenticatedHandler({
  response: authEndpoints.preferences.response,
  handle: ({ user }) => authService.getMyPreferences(user.id),
});

export const updateMyPreferences = createAuthenticatedHandler({
  body: authEndpoints.updatePreferences.body,
  response: authEndpoints.updatePreferences.response,
  handle: ({ user, body }) => authService.updateMyPreferences(user.id, body),
});
