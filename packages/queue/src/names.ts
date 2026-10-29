import { z } from "zod";

export const QUEUE_NAMES = {
  notifications: "notifications",
  bills: "bills",
} as const;

export const NOTIFICATION_JOBS = {
  /** Send one delivery (one notification on one external channel). */
  deliver: "deliver",
  /** Recurring: re-enqueue deliveries that are still pending but have no live job. */
  sweep: "sweep",
  /** Recurring: delete old notifications. */
  cleanup: "cleanup",
} as const;

export const deliverJobSchema = z.object({ deliveryId: z.uuid() });
export type DeliverJobData = z.output<typeof deliverJobSchema>;

export const NOTIFICATION_DELIVERY_ATTEMPTS = 5;
export const NOTIFICATION_DELIVERY_BACKOFF_MS = 30_000;

export const BILL_JOBS = {
  /** Recurring: keep open-ended bills supplied with upcoming occurrences. */
  generate: "generate",
  /** Recurring: send due-soon and overdue reminders. */
  remind: "remind",
} as const;
