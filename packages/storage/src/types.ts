import type { Readable } from "node:stream";

export type PutObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
  /** Stored with the object so a bucket can be inspected or migrated without the database. */
  metadata?: Record<string, string>;
};

export type ByteRange = { start: number; end?: number };

export type GetObjectResult = {
  body: Readable;
  contentType: string | undefined;
  /** Size of the bytes in `body` (the range, when one was requested). */
  contentLength: number | undefined;
  /** Size of the whole object. */
  totalLength: number | undefined;
  /** Set when a range was served. */
  range?: { start: number; end: number };
};

/**
 * What the app needs from an object store. Implementations must be safe to call
 * concurrently and must treat a missing key as `undefined`/no-op, never an error.
 */
export interface StorageProvider {
  put(input: PutObjectInput): Promise<void>;
  get(key: string, range?: ByteRange): Promise<GetObjectResult | undefined>;
  /** Deleting a key that does not exist succeeds. */
  delete(key: string): Promise<void>;
  /** Returns the keys that could not be deleted. */
  deleteMany(keys: readonly string[]): Promise<string[]>;
  exists(key: string): Promise<boolean>;
  /** Lightweight check that credentials and the bucket work. */
  healthCheck(): Promise<void>;
}

export type S3StorageConfig = {
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Omit for AWS S3. Set for R2, GCS (`https://storage.googleapis.com`) and MinIO. */
  endpoint?: string;
  /** `auto` works for R2; use the real region for AWS. */
  region?: string;
  /** MinIO and most self-hosted stores need path-style URLs. Defaults to true when an endpoint is set. */
  forcePathStyle?: boolean;
  /** Prepended to every key, so one bucket can host several environments. */
  keyPrefix?: string;
};
