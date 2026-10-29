import {
  createNotificationQueue,
  createRedisConnection,
  NOTIFICATION_JOBS,
  QUEUE_NAMES,
} from "@luraba/queue";
import { Worker } from "bullmq";
import { channelProviders } from "./channels/index.js";
import { env } from "./config/env.js";
import { pool } from "./db.js";
import { logger } from "./logger.js";
import { processDelivery } from "./notifications/deliver.js";
import * as repository from "./notifications/repository.js";
import { sweepStaleDeliveries } from "./notifications/sweep.js";

const SWEEP_EVERY_MS = 2 * 60 * 1000;
const CLEANUP_EVERY_MS = 60 * 60 * 1000;
const NOTIFICATION_RETENTION_DAYS = 90;

const workerConnection = createRedisConnection(env.redisUrl, "consumer");
const queueConnection = createRedisConnection(env.redisUrl, "consumer");
const notificationQueue = createNotificationQueue(queueConnection);

const notificationWorker = new Worker(
  QUEUE_NAMES.notifications,
  async (job) => {
    switch (job.name) {
      case NOTIFICATION_JOBS.deliver:
        return processDelivery({ repository, channels: channelProviders }, job);
      case NOTIFICATION_JOBS.sweep:
        await sweepStaleDeliveries(notificationQueue);
        return;
      case NOTIFICATION_JOBS.cleanup: {
        const removed = await repository.deleteNotificationsOlderThan(NOTIFICATION_RETENTION_DAYS);
        if (removed > 0) logger.info(`[notifications] Removed ${removed} old notifications`);
        return;
      }
      default:
        logger.warn({ job: job.name }, "[worker] Ignoring unknown job");
    }
  },
  { connection: workerConnection, concurrency: env.concurrency },
);

notificationWorker.on("failed", (job, err) => {
  logger.debug({ err, job: job?.name, id: job?.id }, "[worker] Job failed");
});
notificationWorker.on("error", (err) => logger.error({ err }, "[worker] Worker error"));

// Recurring jobs are upserted by id, so restarting or running several workers never duplicates them.
await notificationQueue.upsertJobScheduler(
  NOTIFICATION_JOBS.sweep,
  { every: SWEEP_EVERY_MS },
  { name: NOTIFICATION_JOBS.sweep },
);
await notificationQueue.upsertJobScheduler(
  NOTIFICATION_JOBS.cleanup,
  { every: CLEANUP_EVERY_MS },
  { name: NOTIFICATION_JOBS.cleanup },
);

const available = Object.values(channelProviders)
  .filter((provider) => provider.isAvailable())
  .map((provider) => provider.channel);
logger.info(
  `[worker] Started (concurrency=${env.concurrency}, channels=${available.join(",") || "none"})`,
);

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`[worker] ${signal} received - shutting down gracefully`);

  await notificationWorker.close();
  await notificationQueue.close();
  workerConnection.disconnect();
  queueConnection.disconnect();
  await pool.end();
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
