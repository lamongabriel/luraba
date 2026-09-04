import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaSchema } from "../list.js";
import {
  createRecurringBillBodySchema,
  listRecurringBillsQuerySchema,
  listRecurringOccurrencesQuerySchema,
  occurrenceParamsSchema,
  recurringBillIdParamsSchema,
  rescheduleOccurrenceBodySchema,
  updateRecurringBillBodySchema,
} from "./requests.js";
import { recurringBillSchema, recurringOccurrenceSchema } from "./resource.js";

export const recurringBillsEndpoints = {
  list: defineEndpoint({
    method: "get",
    path: "/recurring-bills",
    query: listRecurringBillsQuerySchema,
    response: z.array(recurringBillSchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  create: defineEndpoint({
    method: "post",
    path: "/recurring-bills",
    body: createRecurringBillBodySchema,
    response: recurringBillSchema,
    status: 201,
  }),
  get: defineEndpoint({
    method: "get",
    path: "/recurring-bills/:id",
    params: recurringBillIdParamsSchema,
    response: recurringBillSchema,
    status: 200,
  }),
  update: defineEndpoint({
    method: "patch",
    path: "/recurring-bills/:id",
    params: recurringBillIdParamsSchema,
    body: updateRecurringBillBodySchema,
    response: recurringBillSchema,
    status: 200,
  }),
  delete: defineEndpoint({
    method: "delete",
    path: "/recurring-bills/:id",
    params: recurringBillIdParamsSchema,
    status: 204,
  }),
  occurrences: defineEndpoint({
    method: "get",
    path: "/recurring-bills/:id/occurrences",
    params: recurringBillIdParamsSchema,
    query: listRecurringOccurrencesQuerySchema,
    response: z.array(recurringOccurrenceSchema),
    status: 200,
  }),
  skip: defineEndpoint({
    method: "post",
    path: "/recurring-bills/:id/occurrences/:date/skip",
    params: occurrenceParamsSchema,
    status: 204,
  }),
  reschedule: defineEndpoint({
    method: "post",
    path: "/recurring-bills/:id/occurrences/:date/reschedule",
    params: occurrenceParamsSchema,
    body: rescheduleOccurrenceBodySchema,
    status: 204,
  }),
  createOccurrence: defineEndpoint({
    method: "post",
    path: "/recurring-bills/:id/occurrences/:date/create",
    params: occurrenceParamsSchema,
    response: recurringOccurrenceSchema,
    status: 200,
  }),
} as const;
