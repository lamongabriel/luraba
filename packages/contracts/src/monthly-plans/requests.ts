import { z } from "zod";
import { currencyCodeSchema } from "../common.js";
import { monthKeySchema } from "../goals/requests.js";
import { monthlyPlanLineKindSchema } from "./catalog.js";

const planLineSchema = z
  .object({
    kind: monthlyPlanLineKindSchema,
    /** Required for `goal` lines. */
    goalId: z.uuid().optional(),
    /** Minor units of the plan currency. */
    amount: z.number().int().min(0),
  })
  .refine((line) => (line.kind === "goal") === Boolean(line.goalId), {
    message: "goalId is required for goal lines and not allowed for others",
    path: ["goalId"],
  });

const monthRangeFields = {
  from: monthKeySchema,
  /** Defaults to `from`. */
  to: monthKeySchema.optional(),
};

/** Replaces the plan lines of every month in the range with `lines`. */
export const setMonthlyPlanBodySchema = z
  .object({
    ...monthRangeFields,
    currencyCode: currencyCodeSchema,
    lines: z.array(planLineSchema).max(60),
  })
  .refine((value) => !value.to || value.to >= value.from, {
    message: "The last month cannot be before the first",
    path: ["to"],
  });

export const monthlyPlanReportQuerySchema = z.object({
  ...monthRangeFields,
  /** The currency to report in; defaults to the plan's own. */
  currencyCode: currencyCodeSchema.optional(),
});

export type SetMonthlyPlanInput = z.input<typeof setMonthlyPlanBodySchema>;
export type MonthlyPlanReportQuery = z.input<typeof monthlyPlanReportQuerySchema>;
