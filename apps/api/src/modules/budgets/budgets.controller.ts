import { budgetsEndpoints } from "@luraba/contracts/budgets";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import * as budgetsService from "./budgets.service";
import { parseBudgetMonthKey } from "./budgets.types";

export const getMonth = createHouseholdHandler({
  params: budgetsEndpoints.getMonth.params,
  query: budgetsEndpoints.getMonth.query,
  response: budgetsEndpoints.getMonth.response,
  handle: ({ household, params, query }) =>
    budgetsService.getMonthlyBudget(
      household,
      parseBudgetMonthKey(params.month),
      query.displayCurrencyCode,
    ),
});

export const replaceMonth = createHouseholdHandler({
  params: budgetsEndpoints.replaceMonth.params,
  body: budgetsEndpoints.replaceMonth.body,
  response: budgetsEndpoints.replaceMonth.response,
  handle: ({ household, params, body }) =>
    budgetsService.replaceMonthlyBudget(household, parseBudgetMonthKey(params.month), body),
});
