import { defineEndpoint } from "../api.js";
import {
  budgetMonthParamsSchema,
  getBudgetInsightsQuerySchema,
  getMonthlyBudgetQuerySchema,
  replaceMonthlyBudgetBodySchema,
  updateBudgetMonthSettingsBodySchema,
} from "./requests.js";
import { budgetInsightsSchema, monthlyBudgetSchema } from "./resource.js";

export const budgetsEndpoints = {
  getMonth: defineEndpoint({
    method: "get",
    path: "/budgets/:month",
    params: budgetMonthParamsSchema,
    query: getMonthlyBudgetQuerySchema,
    response: monthlyBudgetSchema,
    status: 200,
  }),
  insights: defineEndpoint({
    method: "get",
    path: "/budgets/:month/insights",
    params: budgetMonthParamsSchema,
    query: getBudgetInsightsQuerySchema,
    response: budgetInsightsSchema,
    status: 200,
  }),
  replaceMonth: defineEndpoint({
    method: "put",
    path: "/budgets/:month",
    params: budgetMonthParamsSchema,
    body: replaceMonthlyBudgetBodySchema,
    response: monthlyBudgetSchema,
    status: 200,
  }),
  updateMonthSettings: defineEndpoint({
    method: "put",
    path: "/budgets/:month/settings",
    params: budgetMonthParamsSchema,
    body: updateBudgetMonthSettingsBodySchema,
    response: monthlyBudgetSchema,
    status: 200,
  }),
} as const;
