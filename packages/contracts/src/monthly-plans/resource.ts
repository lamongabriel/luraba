import { z } from "zod";
import { monthlyPlanLineKindSchema } from "./catalog.js";

export const monthlyPlanReportLineSchema = z.object({
  kind: monthlyPlanLineKindSchema,
  goalId: z.uuid().nullable(),
  /** Goal name for goal lines, otherwise a fixed label. */
  label: z.string(),
  projected: z.number().int(),
  actual: z.number().int(),
  /** actual - projected. */
  difference: z.number().int(),
});

export const monthlyPlanReportTotalSchema = z.object({
  projected: z.number().int(),
  actual: z.number().int(),
});

export const monthlyPlanFxSchema = z.object({
  from: z.string(),
  to: z.string(),
  /** Units of `to` per unit of `from`. */
  rate: z.number(),
  rateDate: z.string(),
});

export const monthlyPlanMonthSchema = z.object({
  /** `YYYY-MM`: the competency month. */
  month: z.string(),
  currencyCode: z.string(),
  hasPlan: z.boolean(),
  lines: z.array(monthlyPlanReportLineSchema),
  /** Sum of the goal lines whose goal is an investment. */
  investments: monthlyPlanReportTotalSchema,
  /** Sum of the goal lines whose goal is savings. */
  saved: monthlyPlanReportTotalSchema,
  /** The dates the competency month's salary was received. */
  salaryReceivedOn: z.array(z.string()),
});

export const monthlyPlanReportSchema = z.object({
  currencyCode: z.string(),
  months: z.array(monthlyPlanMonthSchema),
  /** The rate used to show amounts in the secondary currency, when one was needed. */
  fx: monthlyPlanFxSchema.nullable(),
});

export type MonthlyPlanReportLine = z.output<typeof monthlyPlanReportLineSchema>;
export type MonthlyPlanMonth = z.output<typeof monthlyPlanMonthSchema>;
export type MonthlyPlanReport = z.output<typeof monthlyPlanReportSchema>;
