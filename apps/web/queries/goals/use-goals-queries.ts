"use client";

import { useQuery } from "@tanstack/react-query";

import type { AppQueryOptions } from "@/queries/query-options";
import {
  type ContributionQuoteQuery,
  getGoal,
  listGoals,
  quoteContribution,
} from "@/services/goals.service";

type ListGoalsQuery = NonNullable<Parameters<typeof listGoals>[0]>;
type ListGoalsResponse = Awaited<ReturnType<typeof listGoals>>;
type GoalResponse = Awaited<ReturnType<typeof getGoal>>;

export const goalQueryKeys = {
  all: ["goals"] as const,
  lists: () => [...goalQueryKeys.all, "list"] as const,
  list: (query: ListGoalsQuery = {}) => [...goalQueryKeys.lists(), query] as const,
  quote: (query: ContributionQuoteQuery) => [...goalQueryKeys.all, "quote", query] as const,
  detail: (id: string) => [...goalQueryKeys.all, "detail", id] as const,
};

export function useGoalsQuery<TData = ListGoalsResponse>(
  query: ListGoalsQuery = {},
  options?: AppQueryOptions<ListGoalsResponse, TData>,
) {
  return useQuery({
    queryKey: goalQueryKeys.list(query),
    queryFn: () => listGoals(query),
    ...options,
  });
}

export function useGoalQuery<TData = GoalResponse>(
  id: string,
  options?: AppQueryOptions<GoalResponse, TData>,
) {
  return useQuery({
    queryKey: goalQueryKeys.detail(id),
    queryFn: () => getGoal(id),
    enabled: Boolean(id),
    ...options,
  });
}

/** The conversion a contribution in another currency would get on a day (rate of that day, never today's). */
export function useContributionQuoteQuery(query: ContributionQuoteQuery, enabled: boolean) {
  return useQuery({
    queryKey: goalQueryKeys.quote(query),
    queryFn: () => quoteContribution(query),
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
