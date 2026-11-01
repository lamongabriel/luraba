import { apiKeysEndpoints } from "@luraba/contracts/api-keys";
import { createAuthenticatedHandler } from "@/shared/controllers/authenticated.controller";
import * as apiKeysService from "./api-keys.service";

export const list = createAuthenticatedHandler({
  response: apiKeysEndpoints.list.response,
  handle: ({ user }) => apiKeysService.listApiKeys(user.id),
});

export const create = createAuthenticatedHandler({
  body: apiKeysEndpoints.create.body,
  response: apiKeysEndpoints.create.response,
  status: "created",
  handle: ({ user, body }) => apiKeysService.createApiKey(user.id, body),
});

export const update = createAuthenticatedHandler({
  params: apiKeysEndpoints.update.params,
  body: apiKeysEndpoints.update.body,
  response: apiKeysEndpoints.update.response,
  handle: ({ user, params, body }) => apiKeysService.updateApiKey(user.id, params.id, body),
});

export const remove = createAuthenticatedHandler({
  params: apiKeysEndpoints.delete.params,
  status: "no-content",
  handle: ({ user, params }) => apiKeysService.deleteApiKey(user.id, params.id),
});
