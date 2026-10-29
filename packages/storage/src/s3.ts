import type { Readable } from "node:stream";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type {
  ByteRange,
  GetObjectResult,
  PutObjectInput,
  S3StorageConfig,
  StorageProvider,
} from "./types.js";

const DELETE_BATCH_SIZE = 1000;

function isNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { name, $metadata } = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return name === "NoSuchKey" || name === "NotFound" || $metadata?.httpStatusCode === 404;
}

function parseContentRange(value: string | undefined) {
  const match = value?.match(/^bytes (\d+)-(\d+)\/(\d+|\*)$/);
  if (!match) return undefined;
  return {
    start: Number(match[1]),
    end: Number(match[2]),
    total: match[3] === "*" ? undefined : Number(match[3]),
  };
}

function errorName(error: unknown): string | undefined {
  return typeof error === "object" && error !== null
    ? (error as { name?: string }).name
    : undefined;
}

export function createS3Storage(config: S3StorageConfig): StorageProvider {
  const client = new S3Client({
    region: config.region ?? "auto",
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle ?? Boolean(config.endpoint),
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    // Some S3-compatible stores reject the newer default checksum headers.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const bucket = config.bucket;
  const withPrefix = (key: string) => `${config.keyPrefix ?? ""}${key}`;

  // A fresh MinIO has no bucket yet; create it on the first write instead of needing a setup step.
  async function createBucket() {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (error) {
      const name = errorName(error);
      if (name !== "BucketAlreadyOwnedByYou" && name !== "BucketAlreadyExists") throw error;
    }
  }

  return {
    async put(input: PutObjectInput) {
      const command = () =>
        new PutObjectCommand({
          Bucket: bucket,
          Key: withPrefix(input.key),
          Body: input.body,
          ContentType: input.contentType,
          ContentLength: input.body.length,
          Metadata: input.metadata,
        });

      try {
        await client.send(command());
      } catch (error) {
        if (errorName(error) !== "NoSuchBucket") throw error;
        await createBucket();
        await client.send(command());
      }
    },

    async get(key: string, range?: ByteRange): Promise<GetObjectResult | undefined> {
      try {
        const response = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: withPrefix(key),
            Range: range ? `bytes=${range.start}-${range.end ?? ""}` : undefined,
          }),
        );
        if (!response.Body) return undefined;

        const served = parseContentRange(response.ContentRange);
        return {
          body: response.Body as Readable,
          contentType: response.ContentType,
          contentLength: response.ContentLength,
          totalLength: served?.total ?? response.ContentLength,
          range: served ? { start: served.start, end: served.end } : undefined,
        };
      } catch (error) {
        if (isNotFound(error)) return undefined;
        throw error;
      }
    },

    async delete(key: string) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: withPrefix(key) }));
    },

    async deleteMany(keys: readonly string[]) {
      const failed: string[] = [];

      for (let index = 0; index < keys.length; index += DELETE_BATCH_SIZE) {
        const batch = keys.slice(index, index + DELETE_BATCH_SIZE);
        const result = await client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: batch.map((key) => ({ Key: withPrefix(key) })), Quiet: true },
          }),
        );
        for (const error of result.Errors ?? []) {
          if (error.Key) failed.push(error.Key.slice((config.keyPrefix ?? "").length));
        }
      }

      return failed;
    },

    async exists(key: string) {
      try {
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: withPrefix(key) }));
        return true;
      } catch (error) {
        if (isNotFound(error)) return false;
        throw error;
      }
    },

    async healthCheck() {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    },
  };
}
