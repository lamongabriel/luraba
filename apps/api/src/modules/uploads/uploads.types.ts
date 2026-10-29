import type { attachmentsTable, uploadsTable } from "@luraba/db/schemas/uploads.schema";

export type UploadRecord = typeof uploadsTable.$inferSelect & { attachmentCount: number };
export type AttachmentRecord = typeof attachmentsTable.$inferSelect;
export type AttachmentWithUpload = { attachment: AttachmentRecord; upload: UploadRecord };
