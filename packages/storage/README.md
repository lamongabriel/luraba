# @luraba/storage

Provider-agnostic object storage. Nothing else in the repo talks to S3 directly.

```ts
interface StorageProvider {
  put({ key, body, contentType, metadata? }): Promise<void>;
  get(key, range?): Promise<{ body, contentLength, totalLength, range?, contentType? } | undefined>;
  delete(key); deleteMany(keys): Promise<string[] /* failed keys */>;
  exists(key); healthCheck();
}
```

- `createS3Storage(config)` uses `@aws-sdk/client-s3` and works with AWS S3, Cloudflare R2, Google
  Cloud Storage (S3 interoperability, HMAC keys), MinIO and other S3-compatible servers. With an
  `endpoint` it defaults to path-style addressing; `region` defaults to `auto`. Checksums are set to
  "when required" because some compatible servers reject the newer defaults. `put` creates the
  bucket when the server answers `NoSuchBucket` (fresh MinIO).
- `createMemoryStorage()` is the in-process fake for tests (`size()`, `keys()`).
- An optional `keyPrefix` namespaces every key, so one bucket can serve several environments.

To support a non-S3 backend, implement `StorageProvider` and select it in
`apps/api/src/modules/uploads/uploads.storage.ts`.
Configuration and per-vendor setup: [docs/storage.md](../../docs/storage.md).
