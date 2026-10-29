import { enqueueDeliveries, type NotificationQueue } from "@luraba/queue";
import { logger } from "../logger.js";
import { listStalePendingDeliveryIds } from "./repository.js";

const STALE_AFTER_SECONDS = 120;
const SWEEP_LIMIT = 500;

/**
 * Safety net for deliveries the API saved but never managed to queue (Redis was
 * down, the process crashed). Re-adding a delivery that is already queued is a
 * no-op, because the delivery id is the job id.
 */
export async function sweepStaleDeliveries(queue: NotificationQueue): Promise<number> {
  const ids = await listStalePendingDeliveryIds(STALE_AFTER_SECONDS, SWEEP_LIMIT);
  await enqueueDeliveries(queue, ids);
  if (ids.length > 0) logger.info(`[notifications] Sweep re-queued ${ids.length} deliveries`);
  return ids.length;
}
