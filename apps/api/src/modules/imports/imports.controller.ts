import { importBatchSchema, importsEndpoints } from "@luraba/contracts/imports";
import type { Request, Response } from "express";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import { ValidationError } from "@/shared/errors";
import { sendCreated, withApiMeta } from "@/shared/response";
import { getReconciliation } from "./imports.reconciliation.service";
import * as service from "./imports.service";

const e = importsEndpoints;

export const parsers = createHouseholdHandler({
  response: e.parsers.response,
  handle: async () => service.listParsers(),
});

export const list = createHouseholdHandler({
  query: e.list.query,
  response: e.list.response,
  meta: e.list.meta,
  handle: async ({ household, query }) => {
    const result = await service.listImports(household, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const get = createHouseholdHandler({
  params: e.get.params,
  response: e.get.response,
  handle: ({ household, params }) => service.getImport(household, params.id),
});

export const update = createHouseholdHandler({
  params: e.update.params,
  body: e.update.body,
  response: e.update.response,
  handle: ({ household, params, body }) => service.updateImport(household, params.id, body),
});

export const remove = createHouseholdHandler({
  params: e.delete.params,
  status: "no-content",
  handle: ({ household, params }) => service.deleteImport(household, params.id),
});

export const rows = createHouseholdHandler({
  params: e.rows.params,
  query: e.rows.query,
  response: e.rows.response,
  meta: e.rows.meta,
  handle: async ({ household, params, query }) => {
    const result = await service.listRows(household, params.id, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const updateRows = createHouseholdHandler({
  params: e.updateRows.params,
  body: e.updateRows.body,
  response: e.updateRows.response,
  handle: ({ household, params, body }) => service.updateRows(household, params.id, body),
});

export const groups = createHouseholdHandler({
  params: e.groups.params,
  query: e.groups.query,
  response: e.groups.response,
  handle: ({ household, params, query }) => service.listGroups(household, params.id, query.filter),
});

export const saveMapping = createHouseholdHandler({
  params: e.saveMapping.params,
  body: e.saveMapping.body,
  response: e.saveMapping.response,
  handle: ({ household, params, body }) => service.saveMapping(household, params.id, body),
});

export const start = createHouseholdHandler({
  params: e.start.params,
  body: e.start.body,
  response: e.start.response,
  handle: ({ household, params, body }) => service.startImport(household, params.id, body),
});

export const reconciliation = createHouseholdHandler({
  params: e.reconciliation.params,
  response: e.reconciliation.response,
  handle: ({ household, params }) => getReconciliation(household, params.id),
});

/** `POST /imports`: multipart upload (a plain handler, like uploads; the response is `importBatchSchema`). */
export async function upload(req: Request, res: Response): Promise<void> {
  if (!req.file) throw new ValidationError("Attach the statement file in the `file` field");
  const parserId =
    typeof req.body?.parserId === "string" && req.body.parserId ? req.body.parserId : undefined;
  const batch = await service.createImport(req.household as NonNullable<Request["household"]>, {
    fileName: req.file.originalname,
    bytes: req.file.buffer,
    parserId,
  });
  sendCreated(res, importBatchSchema.parse(batch));
}
