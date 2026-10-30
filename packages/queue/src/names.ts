import { z } from "zod";

export const QUEUE_NAMES = {
  notifications: "notifications",
  bills: "bills",
  imports: "imports",
  marketData: "market-data",
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

export const IMPORT_JOBS = {
  /** Create the records of one staged import batch. */
  process: "process",
} as const;

export const importJobSchema = z.object({ batchId: z.uuid() });
export type ImportJobData = z.output<typeof importJobSchema>;

export const MARKET_DATA_JOBS = {
  /** Recurring (every few minutes): refresh the quote of every held asset whose market is open. */
  refreshQuotes: "refresh-quotes",
  /** Recurring (daily): fill the daily price history of held assets. */
  topUpHistory: "top-up-history",
  /** Recurring (daily): CDI/Selic/IPCA/IGP-M/US CPI series. */
  syncMacro: "sync-macro",
  /** Recurring (daily): Tesouro Direto buyback prices. */
  syncTesouro: "sync-tesouro",
  /** Recurring (daily): store one value snapshot per investment account. */
  snapshot: "snapshot",
  /** Recurring (daily): maturity and DARF reminders. */
  reminders: "reminders",
} as const;
export type MarketDataJobName = (typeof MARKET_DATA_JOBS)[keyof typeof MARKET_DATA_JOBS];
