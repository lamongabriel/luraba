import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaSchema, listMetaWithSummarySchema } from "../list.js";
import {
  createTransactionInputSchema,
  listTransactionsQuerySchema,
  transactionAnalyticsQuerySchema,
  transactionIdParamsSchema,
  upcomingTransactionsQuerySchema,
  updateTransactionInputSchema,
} from "./requests.js";
import {
  transactionAnalyticsSchema,
  transactionFeedRowSchema,
  transactionListSummarySchema,
  transactionSchema,
  upcomingTransactionSchema,
} from "./resource.js";

export const transactionsEndpoints = {
  analytics: defineEndpoint({
    method: "get",
    path: "/transactions/analytics",
    query: transactionAnalyticsQuerySchema,
    response: transactionAnalyticsSchema,
    status: 200,
  }),
  upcoming: defineEndpoint({
    method: "get",
    path: "/transactions/upcoming",
    query: upcomingTransactionsQuerySchema,
    response: z.array(upcomingTransactionSchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  list: defineEndpoint({
    method: "get",
    path: "/transactions",
    query: listTransactionsQuerySchema,
    response: z.array(transactionFeedRowSchema),
    meta: listMetaWithSummarySchema(transactionListSummarySchema),
    status: 200,
  }),
  create: defineEndpoint({
    method: "post",
    path: "/transactions",
    body: createTransactionInputSchema,
    response: transactionSchema,
    status: 201,
  }),
  update: defineEndpoint({
    method: "patch",
    path: "/transactions/:id",
    params: transactionIdParamsSchema,
    body: updateTransactionInputSchema,
    response: transactionSchema,
    status: 200,
  }),
  delete: defineEndpoint({
    method: "delete",
    path: "/transactions/:id",
    params: transactionIdParamsSchema,
    status: 204,
  }),
} as const;
