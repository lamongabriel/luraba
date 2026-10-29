import { z } from "zod";

export const BILL_FREQUENCIES = ["weekly", "biweekly", "monthly", "quarterly", "yearly"] as const;
export const BILL_STATUSES = ["active", "paused", "canceled"] as const;
/** Who receives this bill's reminders: its creator only, or every household member. */
export const BILL_AUDIENCES = ["owner", "household"] as const;
export const BILL_OCCURRENCE_STATES = ["scheduled", "overdue", "paid", "skipped"] as const;

export const billFrequencySchema = z.enum(BILL_FREQUENCIES);
export const billStatusSchema = z.enum(BILL_STATUSES);
export const billAudienceSchema = z.enum(BILL_AUDIENCES);
export const billOccurrenceStateSchema = z.enum(BILL_OCCURRENCE_STATES);

export type BillFrequency = z.output<typeof billFrequencySchema>;
export type BillStatus = z.output<typeof billStatusSchema>;
export type BillAudience = z.output<typeof billAudienceSchema>;
export type BillOccurrenceState = z.output<typeof billOccurrenceStateSchema>;
