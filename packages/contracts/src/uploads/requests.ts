import { z } from "zod";
import { idParamsSchema } from "../common.js";
import { booleanQuerySchema, commaSeparatedArraySchema, createListQuerySchema } from "../list.js";
import { attachmentTargetTypeSchema, uploadKindSchema, uploadScopeSchema } from "./catalog.js";

export const uploadIdParamsSchema = idParamsSchema;
export const attachmentIdParamsSchema = idParamsSchema;

/** Where an upload lives. Personal uploads need no household; household uploads use the request's household. */
export const uploadScopeQuerySchema = z.object({
  scope: uploadScopeSchema.default("household"),
});

export const listUploadsQuerySchema = createListQuerySchema(
  {
    scope: uploadScopeSchema.default("household"),
    kind: uploadKindSchema.optional(),
    /** Only uploads that are not attached anywhere. */
    unattached: booleanQuerySchema.optional(),
  },
  ["createdAt", "sizeBytes", "filename"],
);

export const deleteUploadQuerySchema = z.object({
  /** Required to delete an upload that is still attached somewhere. */
  force: booleanQuerySchema.optional(),
});

export const cleanupUploadsBodySchema = z.object({
  /** Only uploads older than this many days are removed, so a fresh upload is never lost mid-flow. */
  olderThanDays: z.number().int().min(0).max(3650).default(7),
  dryRun: z.boolean().default(true),
});

export const createAttachmentBodySchema = z.object({
  uploadId: z.uuid(),
  targetType: attachmentTargetTypeSchema,
  targetId: z.uuid(),
  /** Optional when the target has a single role. */
  role: z.string().trim().min(1).max(32).optional(),
});

export const listAttachmentsQuerySchema = z.object({
  targetType: attachmentTargetTypeSchema,
  targetIds: commaSeparatedArraySchema(z.uuid()).refine(
    (ids) => ids !== undefined && ids.length > 0 && ids.length <= 100,
    "Provide between 1 and 100 target ids",
  ),
  role: z.string().trim().min(1).max(32).optional(),
});

export type ListUploadsQuery = z.input<typeof listUploadsQuerySchema>;
export type DeleteUploadQuery = z.input<typeof deleteUploadQuerySchema>;
export type CleanupUploadsInput = z.input<typeof cleanupUploadsBodySchema>;
export type CreateAttachmentInput = z.input<typeof createAttachmentBodySchema>;
export type ListAttachmentsQuery = z.input<typeof listAttachmentsQuerySchema>;
export type UploadScopeQuery = z.input<typeof uploadScopeQuerySchema>;
