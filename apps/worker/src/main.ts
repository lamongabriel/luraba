import { createNotifier } from "@luraba/notifications";
import {
  BILL_JOBS,
  createBillQueue,
  createNotificationQueue,
  createRedisConnection,
  enqueueDeliveries,
  NOTIFICATION_JOBS,
  QUEUE_NAMES,
} from "@luraba/queue";
import { Worker } from "bullmq";
import { generateOccurrences, sendBillReminders } from "./bills/jobs.js";
import { channelProviders } from "./channels/index.js";
import { env } from "./config/env.js";
import { db, pool } from "./db.js";
import { logger } from "./logger.js";
import { processDelivery } from "./notifications/deliver.js";
import * as repository from "./notifications/repository.js";
import { sweepStaleDeliveries } from "./notifications/sweep.js";

const SWEEP_EVERY_MS = 2 * 60 * 1000;
const CLEANUP_EVERY_MS = 60 * 60 * 1000;
const GENERATE_EVERY_MS = 6 * 60 * 60 * 1000;
const REMIND_EVERY_MS = 60 * 60 * 1000;
const NOTIFICATION_RETENTION_DAYS = 90;

const workerConnection = createRedisConnection(env.redisUrl, "consumer");
const queueConnection = createRedisConnection(env.redisUrl, "consumer");
const notificationQueue = createNotificationQueue(queueConnection);
const billQueue = createBillQueue(queueConnection);

const notifier = createNotifier({
  db,
  availability: {
    email: channelProviders.email.isAvailable(),
    push: channelProviders.push.isAvailable(),
    sms: channelProviders.sms.isAvailable(),
  },
  enqueue: async (deliveryIds) => {
    try {
      await enqueueDeliveries(notificationQueue, deliveryIds);
    } catch (err) {
      logger.warn({ err }, "[bills] Could not enqueue deliveries; the sweep will retry");
    }
  },
  onError: (err, context) => logger.error({ err, ...context }, "[notifications] Failed to emit"),
});

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

const billWorker = new Worker(
  QUEUE_NAMES.bills,
  async (job) => {
    switch (job.name) {
      case BILL_JOBS.generate:
        await generateOccurrences();
        return;
      case BILL_JOBS.remind: {
        const count = await sendBillReminders(notifier);
        if (count > 0) logger.info(`[bills] Evaluated ${count} reminders`);
        return;
      }
      default:
        logger.warn({ job: job.name }, "[worker] Ignoring unknown bill job");
    }
  },
  { connection: workerConnection, concurrency: 1 },
);
billWorker.on("error", (err) => logger.error({ err }, "[worker] Bill worker error"));

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

await billQueue.upsertJobScheduler(
  BILL_JOBS.generate,
  { every: GENERATE_EVERY_MS },
  { name: BILL_JOBS.generate },
);
await billQueue.upsertJobScheduler(
  BILL_JOBS.remind,
  { every: REMIND_EVERY_MS },
  { name: BILL_JOBS.remind },
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
  await billWorker.close();
  await notificationQueue.close();
  await billQueue.close();
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
