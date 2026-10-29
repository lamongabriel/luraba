import { createNotifier } from "@luraba/notifications";
import { db } from "@/db";
import { logger } from "@/shared/logger";
import { channelAvailability } from "./notifications.channels";
import { queueDeliveries } from "./notifications.queue";

export const notifier = createNotifier({
  db,
  availability: channelAvailability,
  enqueue: queueDeliveries,
  onError: (err, context) => logger.error({ err, ...context }, "[notifications] Failed to emit"),
});

export const { notify } = notifier;
