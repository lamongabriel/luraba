"use client";

import {
  type ImportFilter,
  importBatchSchema,
  importsEndpoints,
  type ListImportGroupsQuery,
  type ListImportsQuery,
  type SaveImportMappingInput,
  type StartImportInput,
  type UpdateImportInput,
  type UpdateImportRowsInput,
} from "@luraba/contracts";
import { apiSuccessResponseSchema } from "@luraba/contracts/api";
import { lurabaApiClient } from "@/api/luraba-api";
import { requestContract } from "@/services/contract-client.service";
import { AppClientError } from "@/services/error-client";

export type ListImportRowsParams = {
  page?: number;
  perPage?: number;
  search?: string;
  filter?: ImportFilter;
  sort?: string;
  sortDirection?: "asc" | "desc";
};

/** Sends the statement as multipart/form-data (the one non-JSON call; the response is a contract). */
export async function uploadImport(file: File, parserId?: string) {
  const form = new FormData();
  form.append("file", file, file.name);
  if (parserId) form.append("parserId", parserId);

  const response = await lurabaApiClient.post<unknown>("/imports", form);
  const envelope = apiSuccessResponseSchema(importBatchSchema).safeParse(response.data);
  if (!envelope.success) {
    throw new AppClientError(
      "The API response did not match POST /imports",
      response.status,
      "INVALID_API_RESPONSE",
    );
  }
  return envelope.data.data;
}

export const listImportParsers = () => requestContract(importsEndpoints.parsers);
export const listImports = (query: ListImportsQuery = {}) =>
  requestContract(importsEndpoints.list, { query });
export const getImport = (id: string) => requestContract(importsEndpoints.get, { params: { id } });
export const updateImport = (id: string, body: UpdateImportInput) =>
  requestContract(importsEndpoints.update, { params: { id }, body });
export const deleteImport = (id: string) =>
  requestContract(importsEndpoints.delete, { params: { id } });
export const listImportRows = (id: string, query: ListImportRowsParams = {}) =>
  requestContract(importsEndpoints.rows, { params: { id }, query });
export const updateImportRows = (id: string, body: UpdateImportRowsInput) =>
  requestContract(importsEndpoints.updateRows, { params: { id }, body });
export const listImportGroups = (id: string, query: ListImportGroupsQuery = {}) =>
  requestContract(importsEndpoints.groups, { params: { id }, query });
export const saveImportMapping = (id: string, body: SaveImportMappingInput) =>
  requestContract(importsEndpoints.saveMapping, { params: { id }, body });
export const startImport = (id: string, body: StartImportInput = {}) =>
  requestContract(importsEndpoints.start, { params: { id }, body });
export const getImportReconciliation = (id: string) =>
  requestContract(importsEndpoints.reconciliation, { params: { id } });
