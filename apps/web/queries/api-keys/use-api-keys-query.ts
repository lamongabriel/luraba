"use client";

import { useQuery } from "@tanstack/react-query";

import type { AppQueryOptions } from "@/queries/query-options";
import { listApiKeys } from "@/services/api-keys.service";

type ListApiKeysResponse = Awaited<ReturnType<typeof listApiKeys>>;

export const apiKeyQueryKeys = {
  all: ["api-keys"] as const,
  lists: () => [...apiKeyQueryKeys.all, "list"] as const,
};

export function useApiKeysQuery<TData = ListApiKeysResponse>(
  options?: AppQueryOptions<ListApiKeysResponse, TData>,
) {
  return useQuery({
    queryKey: apiKeyQueryKeys.lists(),
    queryFn: listApiKeys,
    ...options,
  });
}
