"use client";

import { useQuery } from "@tanstack/react-query";

import type { AppQueryOptions } from "@/queries/query-options";
import { getSplit, listSplits } from "@/services/splits.service";

type ListSplitsQuery = NonNullable<Parameters<typeof listSplits>[0]>;
type ListSplitsResponse = Awaited<ReturnType<typeof listSplits>>;
type SplitResponse = Awaited<ReturnType<typeof getSplit>>;

export const splitQueryKeys = {
  all: ["splits"] as const,
  lists: () => [...splitQueryKeys.all, "list"] as const,
  list: (query: ListSplitsQuery = {}) => [...splitQueryKeys.lists(), query] as const,
  detail: (id: string) => [...splitQueryKeys.all, "detail", id] as const,
};

export function useSplitsQuery<TData = ListSplitsResponse>(
  query: ListSplitsQuery = {},
  options?: AppQueryOptions<ListSplitsResponse, TData>,
) {
  return useQuery({
    queryKey: splitQueryKeys.list(query),
    queryFn: () => listSplits(query),
    ...options,
  });
}

export function useSplitQuery<TData = SplitResponse>(
  id: string,
  options?: AppQueryOptions<SplitResponse, TData>,
) {
  return useQuery({
    queryKey: splitQueryKeys.detail(id),
    queryFn: () => getSplit(id),
    enabled: Boolean(id),
    ...options,
  });
}
