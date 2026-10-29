import {
  createImportQueue,
  createImportWorker,
  createRedisConnection,
  enqueueImport,
  type ImportQueue,
} from "@luraba/queue";
import type { Redis } from "ioredis";
import { env } from "@/config/env";
import { logger } from "@/shared/logger";
import { processImportBatch } from "./imports.processor";

let producerConnection: Redis | undefined;
let queue: ImportQueue | undefined;
let workerConnection: Redis | undefined;
let worker: ReturnType<typeof createImportWorker> | undefined;

function getQueue(): ImportQueue | undefined {
  if (!env.redisUrl) return undefined;
  if (!queue) {
    producerConnection = createRedisConnection(env.redisUrl, "producer");
    producerConnection.on("error", (err) =>
      logger.warn({ err }, "[imports] Redis connection error"),
    );
    queue = createImportQueue(producerConnection);
  }
  return queue;
}

/**
 * Queues a batch for the import worker. Without Redis (or when it is unreachable) the batch is
 * processed in this process, asynchronously, so an import never silently stalls.
 */
export async function enqueueImportBatch(batchId: string): Promise<void> {
  const target = getQueue();
  if (target) {
    try {
      await enqueueImport(target, batchId);
      return;
    } catch (err) {
      logger.warn({ err }, "[imports] Could not enqueue the import; running it in-process");
    }
  }
  setImmediate(() => {
    void processImportBatch(batchId).catch((err) =>
      logger.error({ err, batchId }, "[imports] In-process import failed"),
    );
  });
}

/**
 * Starts the BullMQ consumer. The importers reuse the API's transaction and credit card services
 * (ledger entries, installment schedules), so the consumer lives with the API code and can be run
 * in the API process (default) or on its own with `IMPORT_WORKER_ONLY` deployments.
 */
export function startImportWorker(): void {
  if (!env.redisUrl || worker || !env.importWorkerEnabled) return;
  workerConnection = createRedisConnection(env.redisUrl, "consumer");
  worker = createImportWorker(workerConnection, async (batchId) => {
    await processImportBatch(batchId);
  });
  worker.on("error", (err) => logger.error({ err }, "[imports] Worker error"));
  logger.info("[imports] Import worker started");
}

export async function closeImportQueue(): Promise<void> {
  await worker?.close();
  await queue?.close();
  producerConnection?.disconnect();
  workerConnection?.disconnect();
  worker = undefined;
  queue = undefined;
  producerConnection = undefined;
  workerConnection = undefined;
}
