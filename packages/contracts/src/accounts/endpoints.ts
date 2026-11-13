import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaSchema } from "../list.js";
import { listAccountTransactionsQuerySchema } from "../transactions/requests.js";
import { transactionFeedRowSchema } from "../transactions/resource.js";
import {
  accountIdParamsSchema,
  accountInsightsQuerySchema,
  createAccountInputSchema,
  listAccountsQuerySchema,
  updateAccountInputSchema,
} from "./requests.js";
import { accountDetailsSchema, accountInsightsSchema, accountSummarySchema } from "./resource.js";

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
  insights: defineEndpoint({
    method: "get",
    path: "/accounts/:id/insights",
    params: accountIdParamsSchema,
    query: accountInsightsQuerySchema,
    response: accountInsightsSchema,
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
  archive: defineEndpoint({
    method: "post",
    path: "/accounts/:id/archive",
    params: accountIdParamsSchema,
    response: accountDetailsSchema,
    status: 200,
  }),
  unarchive: defineEndpoint({
    method: "post",
    path: "/accounts/:id/unarchive",
    params: accountIdParamsSchema,
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
