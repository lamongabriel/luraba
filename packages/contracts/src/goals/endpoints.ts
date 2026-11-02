import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaSchema } from "../list.js";
import {
  contributeToGoalBodySchema,
  createGoalBodySchema,
  createGoalContributionBodySchema,
  goalContributionParamsSchema,
  goalIdParamsSchema,
  goalsReportQuerySchema,
  listGoalsQuerySchema,
  moveGoalFundsBodySchema,
  updateGoalBodySchema,
  updateGoalContributionBodySchema,
  withdrawFromGoalBodySchema,
} from "./requests.js";
import { goalDetailSchema, goalSchema, goalsReportSchema } from "./resource.js";

export const goalsEndpoints = {
  list: defineEndpoint({
    method: "get",
    path: "/goals",
    query: listGoalsQuerySchema,
    response: z.array(goalSchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  /** Per-goal progress for a month: planned vs contributed, saved, and where the money sits. */
  report: defineEndpoint({
    method: "get",
    path: "/goals/report",
    query: goalsReportQuerySchema,
    response: goalsReportSchema,
    status: 200,
  }),
  get: defineEndpoint({
    method: "get",
    path: "/goals/:id",
    params: goalIdParamsSchema,
    response: goalDetailSchema,
    status: 200,
  }),
  create: defineEndpoint({
    method: "post",
    path: "/goals",
    body: createGoalBodySchema,
    response: goalDetailSchema,
    status: 201,
  }),
  update: defineEndpoint({
    method: "patch",
    path: "/goals/:id",
    params: goalIdParamsSchema,
    body: updateGoalBodySchema,
    response: goalDetailSchema,
    status: 200,
  }),
  delete: defineEndpoint({
    method: "delete",
    path: "/goals/:id",
    params: goalIdParamsSchema,
    status: 204,
  }),
  /** Records money put toward the goal, by hand or backed by a transaction. */
  addContribution: defineEndpoint({
    method: "post",
    path: "/goals/:id/contributions",
    params: goalIdParamsSchema,
    body: createGoalContributionBodySchema,
    response: goalDetailSchema,
    status: 201,
  }),
  /** Puts money toward the goal from one account into another, with a transfer. */
  contribute: defineEndpoint({
    method: "post",
    path: "/goals/:id/contribute",
    params: goalIdParamsSchema,
    body: contributeToGoalBodySchema,
    response: goalDetailSchema,
    status: 201,
  }),
  /** Moves the goal's money between accounts without changing progress. */
  moveFunds: defineEndpoint({
    method: "post",
    path: "/goals/:id/move",
    params: goalIdParamsSchema,
    body: moveGoalFundsBodySchema,
    response: goalDetailSchema,
    status: 201,
  }),
  /** Takes money out of the goal, paying an expense or returning it to an account. */
  withdraw: defineEndpoint({
    method: "post",
    path: "/goals/:id/withdraw",
    params: goalIdParamsSchema,
    body: withdrawFromGoalBodySchema,
    response: goalDetailSchema,
    status: 201,
  }),
  updateContribution: defineEndpoint({
    method: "patch",
    path: "/goals/:id/contributions/:contributionId",
    params: goalContributionParamsSchema,
    body: updateGoalContributionBodySchema,
    response: goalDetailSchema,
    status: 200,
  }),
  removeContribution: defineEndpoint({
    method: "delete",
    path: "/goals/:id/contributions/:contributionId",
    params: goalContributionParamsSchema,
    response: goalDetailSchema,
    status: 200,
  }),
} as const;
