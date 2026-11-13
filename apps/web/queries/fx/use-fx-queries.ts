"use client";

import { useQuery } from "@tanstack/react-query";

import { getCombinedFx, listFxOverrides } from "@/services/fx.service";

export const fxQueryKeys = {
  all: ["fx"] as const,
  rates: (currencies: readonly string[]) =>
    [...fxQueryKeys.all, "rates", [...currencies].sort().join(",")] as const,
  overrides: () => [...fxQueryKeys.all, "overrides"] as const,
};

/** The rates to the household base currency for these currencies (for totals built on the page). */
export function useCombinedFxQuery(currencies: readonly string[], enabled = true) {
  return useQuery({
    queryKey: fxQueryKeys.rates(currencies),
    queryFn: () => getCombinedFx(currencies),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFxOverridesQuery() {
  return useQuery({ queryKey: fxQueryKeys.overrides(), queryFn: listFxOverrides });
}
