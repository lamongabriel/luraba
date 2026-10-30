import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaSchema } from "../list.js";
import {
  createProductBodySchema,
  idParamsSchema,
  listProductsQuerySchema,
  updateProductBodySchema,
} from "./requests.js";
import { productSchema } from "./resource.js";

export const productsEndpoints = {
  list: defineEndpoint({
    method: "get",
    path: "/products",
    query: listProductsQuerySchema,
    response: z.array(productSchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  get: defineEndpoint({
    method: "get",
    path: "/products/:id",
    params: idParamsSchema,
    response: productSchema,
    status: 200,
  }),
  create: defineEndpoint({
    method: "post",
    path: "/products",
    body: createProductBodySchema,
    response: productSchema,
    status: 201,
  }),
  update: defineEndpoint({
    method: "patch",
    path: "/products/:id",
    params: idParamsSchema,
    body: updateProductBodySchema,
    response: productSchema,
    status: 200,
  }),
  delete: defineEndpoint({
    method: "delete",
    path: "/products/:id",
    params: idParamsSchema,
    status: 204,
  }),
} as const;
