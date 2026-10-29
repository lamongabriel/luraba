"use client";

import {
  type CreateGoalContributionInput,
  type CreateGoalInput,
  type GetGoalResult,
  goalsEndpoints,
  type ListGoalsQuery,
  type ListGoalsResult,
  type UpdateGoalContributionInput,
  type UpdateGoalInput,
} from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export type ContributionTarget = { id: string; contributionId: string };

export const listGoals = (query: ListGoalsQuery = {}): Promise<ListGoalsResult> =>
  requestContract(goalsEndpoints.list, { query });

export const getGoal = (id: string): Promise<GetGoalResult> =>
  requestContract(goalsEndpoints.get, { params: { id } });

export const createGoal = (input: CreateGoalInput): Promise<GetGoalResult> =>
  requestContract(goalsEndpoints.create, { body: input });

export const updateGoal = (id: string, input: UpdateGoalInput): Promise<GetGoalResult> =>
  requestContract(goalsEndpoints.update, { params: { id }, body: input });

export const deleteGoal = (id: string): Promise<void> =>
  requestContract(goalsEndpoints.delete, { params: { id } });

export const addContribution = (
  id: string,
  input: CreateGoalContributionInput,
): Promise<GetGoalResult> =>
  requestContract(goalsEndpoints.addContribution, { params: { id }, body: input });

export const updateContribution = (
  target: ContributionTarget,
  input: UpdateGoalContributionInput,
): Promise<GetGoalResult> =>
  requestContract(goalsEndpoints.updateContribution, { params: target, body: input });

export const removeContribution = (target: ContributionTarget): Promise<GetGoalResult> =>
  requestContract(goalsEndpoints.removeContribution, { params: target });
