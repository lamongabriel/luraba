import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaSchema } from "../list.js";
import {
  createTagBodySchema,
  idParamsSchema,
  listTagsQuerySchema,
  updateTagBodySchema,
} from "./requests.js";
import { tagSchema } from "./resource.js";
export const tagsEndpoints = {
  list: defineEndpoint({
    method: "get",
    path: "/tags",
    query: listTagsQuerySchema,
    response: z.array(tagSchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  create: defineEndpoint({
    method: "post",
    path: "/tags",
    body: createTagBodySchema,
    response: tagSchema,
    status: 201,
  }),
  update: defineEndpoint({
    method: "patch",
    path: "/tags/:id",
    params: idParamsSchema,
    body: updateTagBodySchema,
    response: tagSchema,
    status: 200,
  }),
  delete: defineEndpoint({
    method: "delete",
    path: "/tags/:id",
    params: idParamsSchema,
    status: 204,
  }),
} as const;
