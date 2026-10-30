import { Queue, Worker } from "bullmq";
import type { Redis } from "ioredis";
import { MARKET_DATA_JOBS, type MarketDataJobName, QUEUE_NAMES } from "./names.js";

const ONE_HOUR_SECONDS = 60 * 60;

export type MarketDataQueue = Queue;

/** Every five minutes while markets are open; the handler skips closed markets on its own. */
export const QUOTE_REFRESH_EVERY_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const MARKET_DATA_SCHEDULES: Record<MarketDataJobName, number> = {
  [MARKET_DATA_JOBS.refreshQuotes]: QUOTE_REFRESH_EVERY_MS,
  [MARKET_DATA_JOBS.topUpHistory]: DAY_MS,
  [MARKET_DATA_JOBS.syncMacro]: 6 * ONE_HOUR_SECONDS * 1000,
  [MARKET_DATA_JOBS.syncTesouro]: 6 * ONE_HOUR_SECONDS * 1000,
  [MARKET_DATA_JOBS.snapshot]: DAY_MS,
  [MARKET_DATA_JOBS.reminders]: DAY_MS,
};

export function createMarketDataQueue(connection: Redis): MarketDataQueue {
  return new Queue(QUEUE_NAMES.marketData, {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "fixed", delay: 30_000 },
      removeOnComplete: { age: ONE_HOUR_SECONDS },
      removeOnFail: { age: 24 * ONE_HOUR_SECONDS },
    },
  });
}

/** Recurring jobs are upserted by name, so restarts and several processes never duplicate them. */
export async function scheduleMarketDataJobs(queue: MarketDataQueue): Promise<void> {
  for (const [name, every] of Object.entries(MARKET_DATA_SCHEDULES)) {
    await queue.upsertJobScheduler(name, { every }, { name });
  }
}

/** Ask for an immediate run (for example when the app opens and quotes are stale). */
export async function enqueueMarketDataNow(
  queue: MarketDataQueue,
  name: MarketDataJobName,
): Promise<void> {
  // One pending "now" job per kind at a time.
  await queue.add(name, {}, { jobId: `now-${name}-${Math.floor(Date.now() / 30_000)}` });
}

export function createMarketDataWorker(
  connection: Redis,
  handle: (name: MarketDataJobName) => Promise<void>,
): Worker {
  return new Worker(
    QUEUE_NAMES.marketData,
    async (job) => {
      await handle(job.name as MarketDataJobName);
    },
    { connection, concurrency: 1 },
  );
}
