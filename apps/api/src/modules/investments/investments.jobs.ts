import {
  createMarketDataQueue,
  createMarketDataWorker,
  createRedisConnection,
  MARKET_DATA_JOBS,
  MARKET_DATA_SCHEDULES,
  type MarketDataJobName,
  type MarketDataQueue,
  scheduleMarketDataJobs,
} from "@luraba/queue";
import type { Redis } from "ioredis";
import { env } from "@/config/env";
import { logger } from "@/shared/logger";
import {
  refreshHeldQuotes,
  snapshotAccounts,
  syncMacro,
  syncTesouro,
  topUpHistory,
} from "./investments.refresh";

let connection: Redis | undefined;
let queue: MarketDataQueue | undefined;
let worker: ReturnType<typeof createMarketDataWorker> | undefined;
const timers: NodeJS.Timeout[] = [];

export async function runMarketDataJob(name: MarketDataJobName): Promise<void> {
  switch (name) {
    case MARKET_DATA_JOBS.refreshQuotes: {
      const outcome = await refreshHeldQuotes();
      if (outcome.refreshed + outcome.failed > 0)
        logger.info(outcome, "[investments] Quotes refreshed");
      return;
    }
    case MARKET_DATA_JOBS.topUpHistory:
      logger.info(`[investments] History topped up for ${await topUpHistory()} assets`);
      return;
    case MARKET_DATA_JOBS.syncMacro:
      logger.info(`[investments] ${await syncMacro()} macro points synced`);
      return;
    case MARKET_DATA_JOBS.syncTesouro:
      await syncTesouro();
      return;
    case MARKET_DATA_JOBS.snapshot:
      logger.info(`[investments] ${await snapshotAccounts()} account snapshots stored`);
      return;
    case MARKET_DATA_JOBS.reminders: {
      const { sendInvestmentReminders } = await import("./investments.reminders");
      await sendInvestmentReminders();
      return;
    }
    default:
      logger.warn({ name }, "[investments] Unknown market-data job");
  }
}

/**
 * Quote refresh, history/macro/Tesouro sync, snapshots and reminders. With Redis they are BullMQ
 * repeatable jobs (one runner even with several API processes); without it, in-process timers
 * keep a single-node install fresh too. The consumer lives with the API because it reuses the
 * market-data layer, like the import worker.
 */
export async function startMarketDataJobs(): Promise<void> {
  if (!env.marketData.jobsEnabled) return;
  if (env.redisUrl) {
    connection = createRedisConnection(env.redisUrl, "consumer");
    queue = createMarketDataQueue(connection);
    worker = createMarketDataWorker(connection, runMarketDataJob);
    worker.on("error", (err) => logger.error({ err }, "[investments] Market-data worker error"));
    await scheduleMarketDataJobs(queue);
    logger.info("[investments] Market-data jobs scheduled (BullMQ)");
  } else {
    for (const [name, every] of Object.entries(MARKET_DATA_SCHEDULES)) {
      const timer = setInterval(() => {
        void runMarketDataJob(name as MarketDataJobName).catch((err) =>
          logger.error({ err, name }, "[investments] Job failed"),
        );
      }, every);
      timer.unref();
      timers.push(timer);
    }
    logger.info(
      "[investments] Market-data jobs scheduled (in-process timers; set REDIS_URL for BullMQ)",
    );
  }
  // Warm up on boot so the first load after a restart is fresh.
  setTimeout(() => {
    for (const name of [MARKET_DATA_JOBS.syncMacro, MARKET_DATA_JOBS.refreshQuotes]) {
      void runMarketDataJob(name).catch((err) =>
        logger.debug({ err, name }, "[investments] Warm-up failed"),
      );
    }
  }, 5_000).unref();
}

export async function stopMarketDataJobs(): Promise<void> {
  for (const timer of timers) clearInterval(timer);
  timers.length = 0;
  await worker?.close();
  await queue?.close();
  connection?.disconnect();
  worker = queue = connection = undefined;
}
