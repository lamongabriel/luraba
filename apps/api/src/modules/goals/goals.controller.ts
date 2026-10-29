import { goalsEndpoints } from "@luraba/contracts/goals";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import { withApiMeta } from "@/shared/response";
import * as service from "./goals.service";

const e = goalsEndpoints;

export const list = createHouseholdHandler({
  query: e.list.query,
  response: e.list.response,
  meta: e.list.meta,
  handle: async ({ household, query }) => {
    const result = await service.listGoals(household, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const get = createHouseholdHandler({
  params: e.get.params,
  response: e.get.response,
  handle: ({ household, params }) => service.getGoal(household, params.id),
});

export const create = createHouseholdHandler({
  body: e.create.body,
  response: e.create.response,
  status: "created",
  handle: ({ household, body }) => service.createGoal(household, body),
});

export const update = createHouseholdHandler({
  params: e.update.params,
  body: e.update.body,
  response: e.update.response,
  handle: ({ household, params, body }) => service.updateGoal(household, params.id, body),
});

export const deleteGoal = createHouseholdHandler({
  params: e.delete.params,
  status: "no-content",
  handle: ({ household, params }) => service.deleteGoal(household, params.id),
});

export const addContribution = createHouseholdHandler({
  params: e.addContribution.params,
  body: e.addContribution.body,
  response: e.addContribution.response,
  status: "created",
  handle: ({ household, params, body }) => service.addContribution(household, params.id, body),
});

export const updateContribution = createHouseholdHandler({
  params: e.updateContribution.params,
  body: e.updateContribution.body,
  response: e.updateContribution.response,
  handle: ({ household, params, body }) =>
    service.updateContribution(household, params.id, params.contributionId, body),
});

export const removeContribution = createHouseholdHandler({
  params: e.removeContribution.params,
  response: e.removeContribution.response,
  handle: ({ household, params }) =>
    service.removeContribution(household, params.id, params.contributionId),
});
