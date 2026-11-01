import { z } from "zod";
import { defineEndpoint } from "../api.js";
import {
  apiKeyIdParamsSchema,
  createApiKeyBodySchema,
  updateApiKeyBodySchema,
} from "./requests.js";
import { apiKeySchema, createdApiKeySchema } from "./resource.js";

/** User-level (no household): managed with a session only, never with an API key. */
export const apiKeysEndpoints = {
  list: defineEndpoint({
    method: "get",
    path: "/api-keys",
    response: z.array(apiKeySchema),
    status: 200,
  }),
  create: defineEndpoint({
    method: "post",
    path: "/api-keys",
    body: createApiKeyBodySchema,
    response: createdApiKeySchema,
    status: 201,
  }),
  update: defineEndpoint({
    method: "patch",
    path: "/api-keys/:id",
    params: apiKeyIdParamsSchema,
    body: updateApiKeyBodySchema,
    response: apiKeySchema,
    status: 200,
  }),
  delete: defineEndpoint({
    method: "delete",
    path: "/api-keys/:id",
    params: apiKeyIdParamsSchema,
    status: 204,
  }),
} as const;
