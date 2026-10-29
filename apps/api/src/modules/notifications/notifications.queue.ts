import {
  createNotificationQueue,
  createRedisConnection,
  enqueueDeliveries,
  type NotificationQueue,
} from "@luraba/queue";
import type { Redis } from "ioredis";
import { env } from "@/config/env";
import { logger } from "@/shared/logger";

let connection: Redis | undefined;
let queue: NotificationQueue | undefined;

function getQueue(): NotificationQueue | undefined {
  if (!env.redisUrl) return undefined;

  if (!queue) {
    connection = createRedisConnection(env.redisUrl, "producer");
    connection.on("error", (err) => logger.warn({ err }, "[queue] Redis connection error"));
    queue = createNotificationQueue(connection);
  }

  return queue;
}

/**
 * Hands deliveries to the worker. Never throws: the rows are already saved, and
 * the worker's sweep picks up anything that could not be queued here.
 */
export async function queueDeliveries(deliveryIds: readonly string[]): Promise<void> {
  if (deliveryIds.length === 0) return;

  const target = getQueue();
  if (!target) {
    logger.warn("[queue] REDIS_URL is not set; deliveries wait for the worker's sweep");
    return;
  }

  try {
    await enqueueDeliveries(target, deliveryIds);
  } catch (err) {
    logger.warn({ err }, "[queue] Could not enqueue deliveries; the worker sweep will retry");
  }
}

export async function closeNotificationQueue(): Promise<void> {
  await queue?.close();
  connection?.disconnect();
  queue = undefined;
  connection = undefined;
}
