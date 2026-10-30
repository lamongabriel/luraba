import { defineEndpoint } from "../api.js";
import { updateUserPreferencesBodySchema, updateUserProfileBodySchema } from "./requests.js";
import {
  authProvidersSchema,
  authSessionSchema,
  userPreferencesSchema,
  userProfileSchema,
} from "./resource.js";

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
  updateProfile: defineEndpoint({
    method: "patch",
    path: "/auth/me/profile",
    body: updateUserProfileBodySchema,
    response: userProfileSchema,
    status: 200,
  }),
} as const;
