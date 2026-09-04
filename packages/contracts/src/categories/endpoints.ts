import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaSchema } from "../list.js";
import {
  createCategoryBodySchema,
  idParamsSchema,
  listCategoriesQuerySchema,
  updateCategoryBodySchema,
} from "./requests.js";
import { categorySchema } from "./resource.js";

export const categoriesEndpoints = {
  list: defineEndpoint({
    method: "get",
    path: "/categories",
    query: listCategoriesQuerySchema,
    response: z.array(categorySchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  create: defineEndpoint({
    method: "post",
    path: "/categories",
    body: createCategoryBodySchema,
    response: categorySchema,
    status: 201,
  }),
  update: defineEndpoint({
    method: "patch",
    path: "/categories/:id",
    params: idParamsSchema,
    body: updateCategoryBodySchema,
    response: categorySchema,
    status: 200,
  }),
  delete: defineEndpoint({
    method: "delete",
    path: "/categories/:id",
    params: idParamsSchema,
    status: 204,
  }),
} as const;
