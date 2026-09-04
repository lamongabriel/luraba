import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaSchema } from "../list.js";
import { listIntegrationsQuerySchema, updateBrandfetchBodySchema } from "./requests.js";
import { integrationSchema } from "./resource.js";

export const integrationsEndpoints = {
  list: defineEndpoint({
    method: "get",
    path: "/integrations",
    query: listIntegrationsQuerySchema,
    response: z.array(integrationSchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  updateBrandfetch: defineEndpoint({
    method: "put",
    path: "/integrations/brandfetch",
    body: updateBrandfetchBodySchema,
    response: integrationSchema,
    status: 200,
  }),
  deleteBrandfetch: defineEndpoint({
    method: "delete",
    path: "/integrations/brandfetch",
    response: integrationSchema,
    status: 200,
  }),
} as const;
