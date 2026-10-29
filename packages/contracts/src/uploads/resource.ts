import { z } from "zod";
import { wireDateTimeSchema } from "../common.js";
import { attachmentTargetTypeSchema, uploadKindSchema, uploadScopeSchema } from "./catalog.js";

export const uploadSchema = z.object({
  id: z.uuid(),
  scope: uploadScopeSchema,
  householdId: z.uuid().nullable(),
  uploadedByUserId: z.uuid(),
  filename: z.string(),
  contentType: z.string(),
  kind: uploadKindSchema,
  sizeBytes: z.number().int(),
  sha256: z.string(),
  /** How many places use this upload; zero means it is unused and safe to clean up. */
  attachmentCount: z.number().int(),
  createdAt: wireDateTimeSchema,
});

export const attachmentSchema = z.object({
  id: z.uuid(),
  uploadId: z.uuid(),
  targetType: attachmentTargetTypeSchema,
  targetId: z.uuid(),
  role: z.string(),
  position: z.number().int(),
  createdAt: wireDateTimeSchema,
  upload: uploadSchema,
});

export const uploadUsageSchema = z.object({
  totalCount: z.number().int(),
  totalBytes: z.number().int(),
  attachedCount: z.number().int(),
  unattachedCount: z.number().int(),
  unattachedBytes: z.number().int(),
  byKind: z.array(
    z.object({ kind: uploadKindSchema, count: z.number().int(), bytes: z.number().int() }),
  ),
});

export const uploadConfigSchema = z.object({
  /** False until a bucket is configured on the server. */
  enabled: z.boolean(),
  maxUploadBytes: z.number().int(),
});

export const uploadCleanupResultSchema = z.object({
  dryRun: z.boolean(),
  deletedCount: z.number().int(),
  freedBytes: z.number().int(),
  /** Attachments pointing at records that no longer exist, removed before counting unused uploads. */
  prunedAttachments: z.number().int(),
});

export type Upload = z.output<typeof uploadSchema>;
export type Attachment = z.output<typeof attachmentSchema>;
export type UploadUsage = z.output<typeof uploadUsageSchema>;
export type UploadConfig = z.output<typeof uploadConfigSchema>;
export type UploadCleanupResult = z.output<typeof uploadCleanupResultSchema>;
