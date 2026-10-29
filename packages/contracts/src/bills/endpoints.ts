import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaSchema } from "../list.js";
import {
  billForecastQuerySchema,
  billIdParamsSchema,
  billOccurrenceParamsSchema,
  createBillBodySchema,
  linkBillOccurrenceBodySchema,
  listBillOccurrencesQuerySchema,
  listBillsQuerySchema,
  updateBillBodySchema,
  updateBillOccurrenceBodySchema,
} from "./requests.js";
import { billForecastSchema, billOccurrenceSchema, billSchema } from "./resource.js";

export const billsEndpoints = {
  list: defineEndpoint({
    method: "get",
    path: "/bills",
    query: listBillsQuerySchema,
    response: z.array(billSchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  forecast: defineEndpoint({
    method: "get",
    path: "/bills/forecast",
    query: billForecastQuerySchema,
    response: billForecastSchema,
    status: 200,
  }),
  get: defineEndpoint({
    method: "get",
    path: "/bills/:id",
    params: billIdParamsSchema,
    response: billSchema,
    status: 200,
  }),
  create: defineEndpoint({
    method: "post",
    path: "/bills",
    body: createBillBodySchema,
    response: billSchema,
    status: 201,
  }),
  update: defineEndpoint({
    method: "patch",
    path: "/bills/:id",
    params: billIdParamsSchema,
    body: updateBillBodySchema,
    response: billSchema,
    status: 200,
  }),
  pause: defineEndpoint({
    method: "post",
    path: "/bills/:id/pause",
    params: billIdParamsSchema,
    response: billSchema,
    status: 200,
  }),
  resume: defineEndpoint({
    method: "post",
    path: "/bills/:id/resume",
    params: billIdParamsSchema,
    response: billSchema,
    status: 200,
  }),
  cancel: defineEndpoint({
    method: "post",
    path: "/bills/:id/cancel",
    params: billIdParamsSchema,
    response: billSchema,
    status: 200,
  }),
  delete: defineEndpoint({
    method: "delete",
    path: "/bills/:id",
    params: billIdParamsSchema,
    status: 204,
  }),
  listOccurrences: defineEndpoint({
    method: "get",
    path: "/bills/:id/occurrences",
    params: billIdParamsSchema,
    query: listBillOccurrencesQuerySchema,
    response: z.array(billOccurrenceSchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  updateOccurrence: defineEndpoint({
    method: "patch",
    path: "/bills/:id/occurrences/:occurrenceId",
    params: billOccurrenceParamsSchema,
    body: updateBillOccurrenceBodySchema,
    response: billOccurrenceSchema,
    status: 200,
  }),
  linkOccurrence: defineEndpoint({
    method: "post",
    path: "/bills/:id/occurrences/:occurrenceId/link",
    params: billOccurrenceParamsSchema,
    body: linkBillOccurrenceBodySchema,
    response: billOccurrenceSchema,
    status: 200,
  }),
  markOccurrencePaid: defineEndpoint({
    method: "post",
    path: "/bills/:id/occurrences/:occurrenceId/paid",
    params: billOccurrenceParamsSchema,
    response: billOccurrenceSchema,
    status: 200,
  }),
  skipOccurrence: defineEndpoint({
    method: "post",
    path: "/bills/:id/occurrences/:occurrenceId/skip",
    params: billOccurrenceParamsSchema,
    response: billOccurrenceSchema,
    status: 200,
  }),
  /** Back to scheduled: unlinks a transaction, clears paid and skipped. */
  resetOccurrence: defineEndpoint({
    method: "post",
    path: "/bills/:id/occurrences/:occurrenceId/reset",
    params: billOccurrenceParamsSchema,
    response: billOccurrenceSchema,
    status: 200,
  }),
} as const;
