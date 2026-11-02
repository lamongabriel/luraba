import { z } from "zod";

/** salary and taxes are income/expense lines; goal is one goal's contribution; to_spend is the rest. */
export const MONTHLY_PLAN_LINE_KINDS = ["salary", "taxes", "goal", "to_spend"] as const;
export const monthlyPlanLineKindSchema = z.enum(MONTHLY_PLAN_LINE_KINDS);
export type MonthlyPlanLineKind = z.output<typeof monthlyPlanLineKindSchema>;

/**
 * Category paths the plan reads its actuals from. Salary income and business taxes are matched by
 * name (parent > child), so a household that names them differently gets zero actuals.
 */
export const MONTHLY_PLAN_SALARY_CATEGORY = { parent: "Work Income", name: "Salary & Contracts" };
export const MONTHLY_PLAN_TAXES_CATEGORY = { parent: "Business", name: "Business Taxes (DAS)" };
/** Salary received on or after this day of the month belongs to the next month. */
export const SALARY_NEXT_MONTH_FROM_DAY = 16;
