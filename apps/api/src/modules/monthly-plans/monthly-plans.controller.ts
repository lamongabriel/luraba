import { monthlyPlansEndpoints } from "@luraba/contracts/monthly-plans";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import * as service from "./monthly-plans.service";

const e = monthlyPlansEndpoints;

export const report = createHouseholdHandler({
  query: e.report.query,
  response: e.report.response,
  handle: ({ household, query }) => service.getMonthlyPlanReport(household, query),
});

export const set = createHouseholdHandler({
  body: e.set.body,
  response: e.set.response,
  handle: ({ household, body }) => service.setMonthlyPlan(household, body),
});
