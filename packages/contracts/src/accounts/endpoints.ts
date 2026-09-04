import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaSchema } from "../list.js";
import { listAccountTransactionsQuerySchema } from "../transactions/requests.js";
import { transactionFeedRowSchema } from "../transactions/resource.js";
import {
  accountIdParamsSchema,
  createAccountInputSchema,
  listAccountsQuerySchema,
  updateAccountInputSchema,
} from "./requests.js";
import { accountDetailsSchema, accountSummarySchema } from "./resource.js";

export const accountsEndpoints = {
  list: defineEndpoint({
    method: "get",
    path: "/accounts",
    query: listAccountsQuerySchema,
    response: z.array(accountSummarySchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  transactions: defineEndpoint({
    method: "get",
    path: "/accounts/:id/transactions",
    params: accountIdParamsSchema,
    query: listAccountTransactionsQuerySchema,
    response: z.array(transactionFeedRowSchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  get: defineEndpoint({
    method: "get",
    path: "/accounts/:id",
    params: accountIdParamsSchema,
    response: accountDetailsSchema,
    status: 200,
  }),
  create: defineEndpoint({
    method: "post",
    path: "/accounts",
    body: createAccountInputSchema,
    response: accountDetailsSchema,
    status: 201,
  }),
  update: defineEndpoint({
    method: "patch",
    path: "/accounts/:id",
    params: accountIdParamsSchema,
    body: updateAccountInputSchema,
    response: accountDetailsSchema,
    status: 200,
  }),
  delete: defineEndpoint({
    method: "delete",
    path: "/accounts/:id",
    params: accountIdParamsSchema,
    status: 204,
  }),
} as const;
