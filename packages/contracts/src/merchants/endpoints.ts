import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaSchema } from "../list.js";
import {
  createMerchantBodySchema,
  idParamsSchema,
  listMerchantsQuerySchema,
  updateMerchantBodySchema,
} from "./requests.js";
import { merchantSchema } from "./resource.js";

export const merchantsEndpoints = {
  list: defineEndpoint({
    method: "get",
    path: "/merchants",
    query: listMerchantsQuerySchema,
    response: z.array(merchantSchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  get: defineEndpoint({
    method: "get",
    path: "/merchants/:id",
    params: idParamsSchema,
    response: merchantSchema,
    status: 200,
  }),
  create: defineEndpoint({
    method: "post",
    path: "/merchants",
    body: createMerchantBodySchema,
    response: merchantSchema,
    status: 201,
  }),
  update: defineEndpoint({
    method: "patch",
    path: "/merchants/:id",
    params: idParamsSchema,
    body: updateMerchantBodySchema,
    response: merchantSchema,
    status: 200,
  }),
  delete: defineEndpoint({
    method: "delete",
    path: "/merchants/:id",
    params: idParamsSchema,
    status: 204,
  }),
} as const;
