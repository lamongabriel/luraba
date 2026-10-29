import { Queue, Worker } from "bullmq";
import type { Redis } from "ioredis";
import { IMPORT_JOBS, type ImportJobData, importJobSchema, QUEUE_NAMES } from "./names.js";

const ONE_DAY_SECONDS = 24 * 60 * 60;

export type ImportQueue = Queue;

export function createImportQueue(connection: Redis): ImportQueue {
  return new Queue(QUEUE_NAMES.imports, {
    connection,
    defaultJobOptions: {
      // The processor is idempotent (it skips rows that already have a record), so a retry is safe.
      attempts: 2,
      backoff: { type: "fixed", delay: 15_000 },
      removeOnComplete: { age: ONE_DAY_SECONDS },
      removeOnFail: { age: 7 * ONE_DAY_SECONDS },
    },
  });
}

/** One job per run of a batch; starting the same batch again after it finished queues a new run. */
export async function enqueueImport(queue: ImportQueue, batchId: string): Promise<void> {
  await queue.add(IMPORT_JOBS.process, { batchId } satisfies ImportJobData, {
    jobId: `import-${batchId}-${Date.now()}`,
  });
}

/** Consumes import jobs, one batch at a time per worker (rows inside a batch run in order). */
export function createImportWorker(
  connection: Redis,
  process: (batchId: string) => Promise<void>,
): Worker {
  return new Worker(
    QUEUE_NAMES.imports,
    async (job) => {
      if (job.name !== IMPORT_JOBS.process) return;
      await process(importJobSchema.parse(job.data).batchId);
    },
    { connection, concurrency: 1 },
  );
}
