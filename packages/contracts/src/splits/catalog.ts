import { z } from "zod";

export const SPLIT_STATUSES = ["active", "closed"] as const;
/**
 * received: money arrived (a linked transaction or marked by hand).
 * skipped: not collected this time but still part of the plan.
 * written_off: given up on; the loss is accepted.
 * overdue: past the due date and any grace period.
 */
export const SPLIT_INSTALLMENT_STATES = [
  "scheduled",
  "overdue",
  "received",
  "skipped",
  "written_off",
] as const;

export const splitStatusSchema = z.enum(SPLIT_STATUSES);
export const splitInstallmentStateSchema = z.enum(SPLIT_INSTALLMENT_STATES);

export type SplitStatus = z.output<typeof splitStatusSchema>;
export type SplitInstallmentState = z.output<typeof splitInstallmentStateSchema>;
