import { deliverJobSchema } from "@luraba/queue";
import type { ChannelProvider, ExternalChannel, Message, Recipient } from "../channels/types.js";
import { logger } from "../logger.js";
import type * as repository from "./repository.js";

type DeliveryRow = Awaited<ReturnType<typeof repository.getDelivery>>;
type NotificationRow = Awaited<ReturnType<typeof repository.getNotification>>;

export type DeliverDeps = {
  repository: {
    getDelivery(id: string): Promise<DeliveryRow>;
    getNotification(id: string): Promise<NotificationRow>;
    getRecipient(userId: string): Promise<Recipient | undefined>;
    markSent(id: string, attempts: number): Promise<void>;
    markSkipped(id: string, reason: string): Promise<void>;
    recordFailure(id: string, attempts: number, error: string, final: boolean): Promise<void>;
  };
  channels: Record<ExternalChannel, ChannelProvider>;
};

export type DeliverJob = {
  data: unknown;
  attemptsMade: number;
  opts: { attempts?: number };
};

/**
 * Sends one delivery. Resolving means the job is finished (sent or deliberately
 * skipped); throwing makes BullMQ retry it with backoff until its attempts run out.
 */
export async function processDelivery(deps: DeliverDeps, job: DeliverJob): Promise<void> {
  const { deliveryId } = deliverJobSchema.parse(job.data);
  const { repository, channels } = deps;

  const delivery = await repository.getDelivery(deliveryId);
  // Already settled, or removed with its notification: nothing left to send.
  if (!delivery || delivery.status !== "pending") return;

  const provider = channels[delivery.channel as ExternalChannel];
  if (!provider?.isAvailable()) {
    await repository.markSkipped(deliveryId, "Channel is not configured on the worker");
    return;
  }

  const notification = await repository.getNotification(delivery.notificationId);
  const recipient = notification ? await repository.getRecipient(notification.userId) : undefined;
  if (!notification || !recipient) {
    await repository.markSkipped(deliveryId, "Notification or recipient no longer exists");
    return;
  }

  const message: Message = {
    notificationId: notification.id,
    title: notification.title,
    body: notification.body,
    url: notification.url,
  };

  const attempt = job.attemptsMade + 1;

  try {
    const outcome = await provider.deliver(recipient, message);
    if (outcome.status === "sent") await repository.markSent(deliveryId, attempt);
    else await repository.markSkipped(deliveryId, outcome.reason);
  } catch (error) {
    const final = attempt >= (job.opts.attempts ?? 1);
    const reason = error instanceof Error ? error.message : String(error);
    logger.warn(
      { err: error, deliveryId, channel: delivery.channel, attempt, final },
      "[notifications] Delivery attempt failed",
    );
    await repository.recordFailure(deliveryId, attempt, reason, final);
    throw error;
  }
}
