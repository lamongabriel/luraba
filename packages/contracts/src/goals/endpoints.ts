import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaSchema } from "../list.js";
import {
  createGoalBodySchema,
  createGoalContributionBodySchema,
  goalContributionParamsSchema,
  goalIdParamsSchema,
  listGoalsQuerySchema,
  updateGoalBodySchema,
  updateGoalContributionBodySchema,
} from "./requests.js";
import { goalDetailSchema, goalSchema } from "./resource.js";

export const goalsEndpoints = {
  list: defineEndpoint({
    method: "get",
    path: "/goals",
    query: listGoalsQuerySchema,
    response: z.array(goalSchema),
    meta: listMetaSchema(),
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
