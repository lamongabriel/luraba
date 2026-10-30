"use client";

import { useQuery } from "@tanstack/react-query";

import type { AppQueryOptions } from "@/queries/query-options";
import { listProducts } from "@/services/products.service";

type ListProductsQuery = NonNullable<Parameters<typeof listProducts>[0]>;
type ListProductsResponse = Awaited<ReturnType<typeof listProducts>>;

export const productQueryKeys = {
  all: ["products"] as const,
  lists: () => [...productQueryKeys.all, "list"] as const,
  list: (query: ListProductsQuery = {}) => [...productQueryKeys.lists(), query] as const,
};

export function useProductsQuery<TData = ListProductsResponse>(
  query: ListProductsQuery = {},
  options?: AppQueryOptions<ListProductsResponse, TData>,
) {
  return useQuery({
    queryKey: productQueryKeys.list(query),
    queryFn: () => listProducts(query),
    ...options,
  });
}
