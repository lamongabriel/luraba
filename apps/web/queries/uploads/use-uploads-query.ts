"use client";

import { useQuery } from "@tanstack/react-query";

import type { AppQueryOptions } from "@/queries/query-options";
import {
  getUploadConfig,
  getUploadUsage,
  listAttachments,
  listUploads,
  type UploadScope,
} from "@/services/uploads.service";

type ListUploadsQuery = NonNullable<Parameters<typeof listUploads>[0]>;
type ListAttachmentsQuery = Parameters<typeof listAttachments>[0];
type ListUploadsResponse = Awaited<ReturnType<typeof listUploads>>;
type ListAttachmentsResponse = Awaited<ReturnType<typeof listAttachments>>;

export const uploadQueryKeys = {
  all: ["uploads"] as const,
  config: () => [...uploadQueryKeys.all, "config"] as const,
  lists: () => [...uploadQueryKeys.all, "list"] as const,
  list: (query: ListUploadsQuery = {}) => [...uploadQueryKeys.lists(), query] as const,
  usage: (scope: UploadScope) => [...uploadQueryKeys.all, "usage", scope] as const,
  attachments: () => [...uploadQueryKeys.all, "attachments"] as const,
  attachmentsFor: (query: ListAttachmentsQuery) =>
    [...uploadQueryKeys.attachments(), query] as const,
};

export function useUploadConfigQuery() {
  return useQuery({
    queryKey: uploadQueryKeys.config(),
    queryFn: getUploadConfig,
    staleTime: 5 * 60_000,
  });
}

export function useUploadsQuery(
  query: ListUploadsQuery = {},
  options?: AppQueryOptions<ListUploadsResponse>,
) {
  return useQuery({
    queryKey: uploadQueryKeys.list(query),
    queryFn: () => listUploads(query),
    ...options,
  });
}

export function useUploadUsageQuery(scope: UploadScope) {
  return useQuery({ queryKey: uploadQueryKeys.usage(scope), queryFn: () => getUploadUsage(scope) });
}

export function useAttachmentsQuery(
  query: ListAttachmentsQuery,
  options?: AppQueryOptions<ListAttachmentsResponse>,
) {
  return useQuery({
    queryKey: uploadQueryKeys.attachmentsFor(query),
    queryFn: () => listAttachments(query),
    ...options,
  });
}
