# uploads

The storage layer: a library of uploaded files plus polymorphic attachments to any record. Backends
are S3-compatible (MinIO by default, S3, Cloudflare R2, Google Cloud Storage): see
[docs/storage.md](../../../../../docs/storage.md).

## Concepts

- **Upload** (`uploads`): one stored object. `scope = "user"` (personal, `household_id` null) or
  `"household"`. Always records `uploaded_by_user_id`. Has the sha256, sniffed content type and kind
  (`image | pdf | document | text | other`). A user may upload many files and never use them.
- **Attachment** (`attachments`): links an upload to `(targetType, targetId, role)`. The registry in
  `packages/contracts/src/uploads/catalog.ts` (`ATTACHMENT_TARGETS`) defines each target's roles,
  whether a role holds `one` file (attaching again replaces it) or `many`, and which kinds it
  accepts. `uploads.targets.ts` maps household targets to their tables to check ownership.
- Unused uploads (no attachment) show up with `unattached=true`; `POST /uploads/cleanup` deletes
  those older than N days (`dryRun` by default).

## Rules

- This module does **not** use `HouseholdScopedRepository`: user-scope rows have no household, and
  access is decided from the upload row (`assertAccess` in the service) so that
  `GET /uploads/:id/content` works from an `<img>` with only the session cookie.
- Bytes go through the API (multer memory storage, limit `STORAGE_MAX_UPLOAD_MB`), never browser
  to bucket directly. The content type is sniffed (`file-type`), not trusted from the client. SVG is
  served as `other` with a sandbox CSP.
- Object keys are random (`households/<id>/<uploadId>` or `users/<id>/<uploadId>`).
- `deleteUpload` returns 409 while attached unless `force=true`. Household deletion collects object
  keys first and removes the objects after the database delete.
- Records pointing at a deleted target are not cascaded (polymorphic); cleanup prunes dangling
  attachments.
- Binary routes (`POST /uploads`, `GET /uploads/:id/content`) are plain Express handlers outside the
  contract registry; everything else uses contracts.
- Tests inject `createMemoryStorage()` with `setStorageForTesting`.
- The attachment-count subquery qualifies `"uploads"."id"` by hand (Drizzle gotcha, see AGENTS.md).

## Adding a new attachable thing

1. Add the target (roles, cardinality, accepted kinds) to `ATTACHMENT_TARGETS`.
2. Add its table to `HOUSEHOLD_TARGET_TABLES` in `uploads.targets.ts`.
3. In the web app render `<AttachmentGallery targetType=... targetId=... attachmentRole=... />`.
No migration is needed.

General module conventions: [../README.md](../README.md).
