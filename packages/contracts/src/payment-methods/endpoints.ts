import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaSchema } from "../list.js";
import {
  createPaymentMethodBodySchema,
  idParamsSchema,
  listPaymentMethodsQuerySchema,
  updatePaymentMethodBodySchema,
} from "./requests.js";
import { paymentMethodSchema } from "./resource.js";
export const paymentMethodsEndpoints = {
  list: defineEndpoint({
    method: "get",
    path: "/payment-methods",
    query: listPaymentMethodsQuerySchema,
    response: z.array(paymentMethodSchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  create: defineEndpoint({
    method: "post",
    path: "/payment-methods",
    body: createPaymentMethodBodySchema,
    response: paymentMethodSchema,
    status: 201,
  }),
  update: defineEndpoint({
    method: "patch",
    path: "/payment-methods/:id",
    params: idParamsSchema,
    body: updatePaymentMethodBodySchema,
    response: paymentMethodSchema,
    status: 200,
  }),
  delete: defineEndpoint({
    method: "delete",
    path: "/payment-methods/:id",
    params: idParamsSchema,
    status: 204,
  }),
} as const;
