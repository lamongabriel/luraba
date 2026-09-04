import { defineEndpoint } from "../api.js";
import { updateUserPreferencesBodySchema } from "./requests.js";
import { authProvidersSchema, authSessionSchema, userPreferencesSchema } from "./resource.js";

export const authEndpoints = {
  providers: defineEndpoint({
    method: "get",
    path: "/auth/providers",
    response: authProvidersSchema,
    status: 200,
  }),
  me: defineEndpoint({ method: "get", path: "/auth/me", response: authSessionSchema, status: 200 }),
  preferences: defineEndpoint({
    method: "get",
    path: "/auth/me/preferences",
    response: userPreferencesSchema,
    status: 200,
  }),
  updatePreferences: defineEndpoint({
    method: "patch",
    path: "/auth/me/preferences",
    body: updateUserPreferencesBodySchema,
    response: userPreferencesSchema,
    status: 200,
  }),
} as const;
