import type { UseQueryOptions } from "@tanstack/react-query";

import type { AppClientError } from "@/services/error-client";

export type AppQueryOptions<TQueryFnData, TData = TQueryFnData> = Omit<
  UseQueryOptions<TQueryFnData, AppClientError, TData>,
  "queryFn" | "queryKey"
>;
