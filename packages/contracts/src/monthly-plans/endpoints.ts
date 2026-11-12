import { defineEndpoint } from "../api.js";
import { monthlyPlanReportQuerySchema, setMonthlyPlanBodySchema } from "./requests.js";
import { monthlyPlanReportSchema } from "./resource.js";
import { safeToSpendQuerySchema, safeToSpendSchema } from "./safe-to-spend.js";

export const monthlyPlansEndpoints = {
  /** Projected vs actual for every line of each month in the range. */
  report: defineEndpoint({
    method: "get",
    path: "/monthly-plans",
    query: monthlyPlanReportQuerySchema,
    response: monthlyPlanReportSchema,
    status: 200,
  }),
  /** How much can still be spent this month in cash and next month on the card, per currency. */
  safeToSpend: defineEndpoint({
    method: "get",
    path: "/monthly-plans/safe-to-spend",
    query: safeToSpendQuerySchema,
    response: safeToSpendSchema,
    status: 200,
  }),
  /** Sets the projected lines for a month or a range of months, and returns the report. */
  set: defineEndpoint({
    method: "put",
    path: "/monthly-plans",
    body: setMonthlyPlanBodySchema,
    response: monthlyPlanReportSchema,
    status: 200,
  }),
} as const;
