"use client";

import type { ImportBatch, ListImportGroupsQuery, ListImportsQuery } from "@luraba/contracts";
import { useQuery } from "@tanstack/react-query";
import type { AppQueryOptions } from "@/queries/query-options";
import { listExporters } from "@/services/exports.service";
import {
  getImport,
  getImportReconciliation,
  type ListImportRowsParams,
  listImportGroups,
  listImportParsers,
  listImportRows,
  listImports,
} from "@/services/imports.service";

export const importQueryKeys = {
  all: ["imports"] as const,
  parsers: () => [...importQueryKeys.all, "parsers"] as const,
  lists: () => [...importQueryKeys.all, "list"] as const,
  list: (query: ListImportsQuery = {}) => [...importQueryKeys.lists(), query] as const,
  detail: (id: string) => [...importQueryKeys.all, "detail", id] as const,
  rows: (id: string, query: ListImportRowsParams = {}) =>
    [...importQueryKeys.detail(id), "rows", query] as const,
  groups: (id: string, query: ListImportGroupsQuery = {}) =>
    [...importQueryKeys.detail(id), "groups", query] as const,
  reconciliation: (id: string) => [...importQueryKeys.detail(id), "reconciliation"] as const,
  exporters: () => ["exports", "list"] as const,
};

const RUNNING: ReadonlyArray<ImportBatch["status"]> = ["queued", "importing"];

export function isImportRunning(batch: ImportBatch | undefined): boolean {
  return Boolean(batch && RUNNING.includes(batch.status));
}

export function useImportParsersQuery() {
  return useQuery({ queryKey: importQueryKeys.parsers(), queryFn: listImportParsers });
}

export function useImportsQuery(query: ListImportsQuery = {}) {
  return useQuery({
    queryKey: importQueryKeys.list(query),
    queryFn: () => listImports(query),
    refetchInterval: (state) =>
      state.state.data?.data.some((batch) => isImportRunning(batch)) ? 2000 : false,
  });
}

/** Polls every 1.5 s while the import is queued or running. */
export function useImportQuery(id: string | null) {
  return useQuery({
    queryKey: importQueryKeys.detail(id ?? ""),
    queryFn: () => getImport(id as string),
    enabled: Boolean(id),
    refetchInterval: (state) => (isImportRunning(state.state.data) ? 1500 : false),
  });
}

export function useImportRowsQuery(
  id: string | null,
  query: ListImportRowsParams = {},
  options?: AppQueryOptions<Awaited<ReturnType<typeof listImportRows>>>,
) {
  return useQuery({
    queryKey: importQueryKeys.rows(id ?? "", query),
    queryFn: () => listImportRows(id as string, query),
    ...options,
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

export function useImportGroupsQuery(id: string | null, query: ListImportGroupsQuery = {}) {
  return useQuery({
    queryKey: importQueryKeys.groups(id ?? "", query),
    queryFn: () => listImportGroups(id as string, query),
    enabled: Boolean(id),
  });
}

export function useImportReconciliationQuery(id: string | null, enabled = true) {
  return useQuery({
    queryKey: importQueryKeys.reconciliation(id ?? ""),
    queryFn: () => getImportReconciliation(id as string),
    enabled: Boolean(id) && enabled,
  });
}

export function useExportersQuery() {
  return useQuery({ queryKey: importQueryKeys.exporters(), queryFn: listExporters });
}
