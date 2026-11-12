import { monthlyPlansEndpoints } from "@luraba/contracts/monthly-plans";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import * as service from "./monthly-plans.service";
import * as safeToSpendService from "./safe-to-spend.service";

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

export const safeToSpend = createHouseholdHandler({
  query: e.safeToSpend.query,
  response: e.safeToSpend.response,
  handle: ({ household, query }) => safeToSpendService.getSafeToSpend(household, query),
});
