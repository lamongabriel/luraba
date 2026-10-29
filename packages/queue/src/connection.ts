import { Redis } from "ioredis";

export type RedisRole = "producer" | "consumer";

/**
 * Producers (the API) fail fast when Redis is down so a request is never held
 * up by a queue. Consumers (the worker) must wait forever, which BullMQ
 * requires (`maxRetriesPerRequest: null`).
 */
export function createRedisConnection(url: string, role: RedisRole): Redis {
  return role === "consumer"
    ? new Redis(url, { maxRetriesPerRequest: null })
    : new Redis(url, { enableOfflineQueue: false, maxRetriesPerRequest: 1 });
}
