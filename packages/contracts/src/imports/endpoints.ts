import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaSchema } from "../list.js";
import {
  importIdParamsSchema,
  listImportGroupsQuerySchema,
  listImportRowsQuerySchema,
  listImportsQuerySchema,
  saveImportMappingBodySchema,
  startImportBodySchema,
  updateImportBodySchema,
  updateImportRowsBodySchema,
} from "./requests.js";
import {
  importBatchSchema,
  importGroupSchema,
  importParserSchema,
  importReconciliationSchema,
  importRowSchema,
} from "./resource.js";

/**
 * `POST /imports` (the file upload, multipart) is a plain Express route like uploads: it is not
 * listed here. Its response is `importBatchSchema`.
 */
export const importsEndpoints = {
  parsers: defineEndpoint({
    method: "get",
    path: "/imports/parsers",
    response: z.array(importParserSchema),
    status: 200,
  }),
  list: defineEndpoint({
    method: "get",
    path: "/imports",
    query: listImportsQuerySchema,
    response: z.array(importBatchSchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  get: defineEndpoint({
    method: "get",
    path: "/imports/:id",
    params: importIdParamsSchema,
    response: importBatchSchema,
    status: 200,
  }),
  update: defineEndpoint({
    method: "patch",
    path: "/imports/:id",
    params: importIdParamsSchema,
    body: updateImportBodySchema,
    response: importBatchSchema,
    status: 200,
  }),
  delete: defineEndpoint({
    method: "delete",
    path: "/imports/:id",
    params: importIdParamsSchema,
    status: 204,
  }),
  rows: defineEndpoint({
    method: "get",
    path: "/imports/:id/rows",
    params: importIdParamsSchema,
    query: listImportRowsQuerySchema,
    response: z.array(importRowSchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  updateRows: defineEndpoint({
    method: "patch",
    path: "/imports/:id/rows",
    params: importIdParamsSchema,
    body: updateImportRowsBodySchema,
    response: importBatchSchema,
    status: 200,
  }),
  groups: defineEndpoint({
    method: "get",
    path: "/imports/:id/groups",
    params: importIdParamsSchema,
    query: listImportGroupsQuerySchema,
    response: z.array(importGroupSchema),
    status: 200,
  }),
  saveMapping: defineEndpoint({
    method: "put",
    path: "/imports/:id/mappings",
    params: importIdParamsSchema,
    body: saveImportMappingBodySchema,
    response: importBatchSchema,
    status: 200,
  }),
  start: defineEndpoint({
    method: "post",
    path: "/imports/:id/start",
    params: importIdParamsSchema,
    body: startImportBodySchema,
    response: importBatchSchema,
    status: 200,
  }),
  reconciliation: defineEndpoint({
    method: "get",
    path: "/imports/:id/reconciliation",
    params: importIdParamsSchema,
    response: importReconciliationSchema,
    status: 200,
  }),
} as const;
