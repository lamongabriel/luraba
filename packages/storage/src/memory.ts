import { Readable } from "node:stream";
import type { ByteRange, GetObjectResult, PutObjectInput, StorageProvider } from "./types.js";

/** In-process store for tests and for running without a bucket. Data is lost on restart. */
export function createMemoryStorage(): StorageProvider & { size(): number; keys(): string[] } {
  const objects = new Map<string, { body: Buffer; contentType: string }>();

  return {
    async put(input: PutObjectInput) {
      objects.set(input.key, { body: Buffer.from(input.body), contentType: input.contentType });
    },

    async get(key: string, range?: ByteRange): Promise<GetObjectResult | undefined> {
      const object = objects.get(key);
      if (!object) return undefined;

      const total = object.body.length;
      if (!range) {
        return {
          body: Readable.from([object.body]),
          contentType: object.contentType,
          contentLength: total,
          totalLength: total,
        };
      }

      const end = Math.min(range.end ?? total - 1, total - 1);
      const slice = object.body.subarray(range.start, end + 1);
      return {
        body: Readable.from([slice]),
        contentType: object.contentType,
        contentLength: slice.length,
        totalLength: total,
        range: { start: range.start, end },
      };
    },

    async delete(key: string) {
      objects.delete(key);
    },

    async deleteMany(keys: readonly string[]) {
      for (const key of keys) objects.delete(key);
      return [];
    },

    async exists(key: string) {
      return objects.has(key);
    },

    async healthCheck() {},

    size: () => objects.size,
    keys: () => [...objects.keys()],
  };
}
