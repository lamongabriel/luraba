"use client";

import { useQuery } from "@tanstack/react-query";

import type { AppQueryOptions } from "@/queries/query-options";
import {
  getGoalPiggyPlan,
  getPiggyBank,
  getPiggyBanksReport,
  type ListPiggyBanksQuery,
  listPiggyBankMovements,
  listPiggyBanks,
  type PiggyBankMovementsQuery,
} from "@/services/piggy-banks.service";

type ListResponse = Awaited<ReturnType<typeof listPiggyBanks>>;
type DetailResponse = Awaited<ReturnType<typeof getPiggyBank>>;
type MovementsResponse = Awaited<ReturnType<typeof listPiggyBankMovements>>;
type ReportResponse = Awaited<ReturnType<typeof getPiggyBanksReport>>;
type PlanResponse = Awaited<ReturnType<typeof getGoalPiggyPlan>>;

export const piggyBankQueryKeys = {
  all: ["piggy-banks"] as const,
  lists: () => [...piggyBankQueryKeys.all, "list"] as const,
  list: (query: ListPiggyBanksQuery = {}) => [...piggyBankQueryKeys.lists(), query] as const,
  detail: (id: string) => [...piggyBankQueryKeys.all, "detail", id] as const,
  movements: (id: string, query: PiggyBankMovementsQuery = {}) =>
    [...piggyBankQueryKeys.detail(id), "movements", query] as const,
  report: (month?: string) => [...piggyBankQueryKeys.all, "report", month ?? "current"] as const,
  goalPlan: (goalId: string) => [...piggyBankQueryKeys.all, "goal-plan", goalId] as const,
};

export function usePiggyBanksQuery<TData = ListResponse>(
  query: ListPiggyBanksQuery = {},
  options?: AppQueryOptions<ListResponse, TData>,
) {
  return useQuery({
    queryKey: piggyBankQueryKeys.list(query),
    queryFn: () => listPiggyBanks(query),
    ...options,
  });
}

export function usePiggyBankQuery<TData = DetailResponse>(
  id: string,
  options?: AppQueryOptions<DetailResponse, TData>,
) {
  return useQuery({
    queryKey: piggyBankQueryKeys.detail(id),
    queryFn: () => getPiggyBank(id),
    enabled: Boolean(id),
    ...options,
  });
}

export function usePiggyBankMovementsQuery<TData = MovementsResponse>(
  id: string,
  query: PiggyBankMovementsQuery = {},
  options?: AppQueryOptions<MovementsResponse, TData>,
) {
  return useQuery({
    queryKey: piggyBankQueryKeys.movements(id, query),
    queryFn: () => listPiggyBankMovements(id, query),
    enabled: Boolean(id),
    ...options,
  });
}

export function usePiggyBanksReportQuery<TData = ReportResponse>(
  month?: string,
  options?: AppQueryOptions<ReportResponse, TData>,
) {
  return useQuery({
    queryKey: piggyBankQueryKeys.report(month),
    queryFn: () => getPiggyBanksReport(month),
    ...options,
  });
}

export function useGoalPiggyPlanQuery<TData = PlanResponse>(
  goalId: string,
  options?: AppQueryOptions<PlanResponse, TData>,
) {
  return useQuery({
    queryKey: piggyBankQueryKeys.goalPlan(goalId),
    queryFn: () => getGoalPiggyPlan(goalId),
    enabled: Boolean(goalId),
    ...options,
  });
}
