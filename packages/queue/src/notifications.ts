import { Queue } from "bullmq";
import type { Redis } from "ioredis";
import {
  type DeliverJobData,
  NOTIFICATION_DELIVERY_ATTEMPTS,
  NOTIFICATION_DELIVERY_BACKOFF_MS,
  NOTIFICATION_JOBS,
  QUEUE_NAMES,
} from "./names.js";

const ONE_HOUR_SECONDS = 60 * 60;
const SEVEN_DAYS_SECONDS = 7 * 24 * ONE_HOUR_SECONDS;

export type NotificationQueue = Queue;

export function createNotificationQueue(connection: Redis): NotificationQueue {
  return new Queue(QUEUE_NAMES.notifications, {
    connection,
    defaultJobOptions: {
      attempts: NOTIFICATION_DELIVERY_ATTEMPTS,
      backoff: { type: "exponential", delay: NOTIFICATION_DELIVERY_BACKOFF_MS },
      removeOnComplete: { age: ONE_HOUR_SECONDS },
      // Kept for a week so a failed job still holds its id and is never re-added by the sweep.
      removeOnFail: { age: SEVEN_DAYS_SECONDS },
    },
  });
}

/**
 * Queues deliveries. The delivery id is the job id, so enqueueing the same
 * delivery twice (for example by the API and then the sweep) never sends twice.
 */
export async function enqueueDeliveries(
  queue: NotificationQueue,
  deliveryIds: readonly string[],
): Promise<void> {
  if (deliveryIds.length === 0) return;

  await queue.addBulk(
    deliveryIds.map((deliveryId) => ({
      name: NOTIFICATION_JOBS.deliver,
      data: { deliveryId } satisfies DeliverJobData,
      opts: { jobId: deliveryId },
    })),
  );
}
