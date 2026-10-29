# File storage

Luraba stores uploaded files (profile pictures, receipts, logos, documents) in any S3-compatible
bucket. The API proxies uploads and downloads, so buckets stay private and need no CORS setup.

## Choose a backend

`USE_MINIO` (default `true`) selects the backend.

### MinIO (default, self-hosted)

`pnpm dev` starts a `minio` service from `compose.yaml` (built from `docker/minio`, because MinIO no
longer publishes pullable images) and the API connects with the `MINIO_*` variables. Files live in
the `minio_data` Docker volume. The console is at <http://localhost:9001> (user `luraba`, password
`luraba-secret-key`; change both for any real deployment). The `luraba` bucket is created on the
first upload.

| Variable | Default |
| --- | --- |
| `USE_MINIO` | `true` |
| `MINIO_ENDPOINT` | `http://localhost:9000` (`http://minio:9000` inside Compose) |
| `MINIO_BUCKET` | `luraba` |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | `luraba` / `luraba-secret-key` |

For a home lab, bind the volume to a disk path in `compose.yaml` (`/mnt/disk/luraba:/data`).

### AWS S3, Cloudflare R2, Google Cloud Storage, others

Set `USE_MINIO=false` and:

| Variable | Notes |
| --- | --- |
| `STORAGE_BUCKET` | Bucket name (create it first). |
| `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | Keys with read/write/delete on the bucket. |
| `STORAGE_ENDPOINT` | Empty for AWS S3. R2: `https://<account>.r2.cloudflarestorage.com`. GCS: `https://storage.googleapis.com`. |
| `STORAGE_REGION` | AWS region, or `auto` (default) for R2. |
| `STORAGE_FORCE_PATH_STYLE` | Defaults to path-style when an endpoint is set. |
| `STORAGE_KEY_PREFIX` | Optional namespace inside the bucket. |
| `STORAGE_MAX_UPLOAD_MB` | Per-file limit, default 20. |

- **Cloudflare R2**: create an API token with Object Read & Write; use its S3 access key pair.
- **Google Cloud Storage**: create HMAC keys for a service account (Cloud Storage > Settings >
  Interoperability) and use the endpoint above.
- **AWS S3**: an IAM user limited to the bucket.

If no backend is usable the API still starts; upload endpoints answer 503 and the web app hides the
upload controls (`GET /uploads/config` reports `enabled`).

## Data model

See [apps/api/src/modules/uploads/README.md](../apps/api/src/modules/uploads/README.md): an upload
is a stored file owned by a user or household and tracked with who uploaded it; attachments link
uploads to records (a profile picture, a transaction receipt...). Unattached uploads can be reviewed
and cleaned up (`POST /uploads/cleanup`).

## Backups

Back up the bucket (or the `minio_data` volume) together with the database: the database only holds
references.
