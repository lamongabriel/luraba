import { defineEndpoint } from "../api.js";
import {
  budgetMonthParamsSchema,
  getMonthlyBudgetQuerySchema,
  replaceMonthlyBudgetBodySchema,
} from "./requests.js";
import { monthlyBudgetSchema } from "./resource.js";

export const budgetsEndpoints = {
  getMonth: defineEndpoint({
    method: "get",
    path: "/budgets/:month",
    params: budgetMonthParamsSchema,
    query: getMonthlyBudgetQuerySchema,
    response: monthlyBudgetSchema,
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
} as const;
