import type { EndpointResult } from "../api.js";
import type { uploadsEndpoints } from "./endpoints.js";

export type ListUploadsResult = EndpointResult<typeof uploadsEndpoints.list>;
export type ListAttachmentsResult = EndpointResult<typeof uploadsEndpoints.listAttachments>;
export type UploadResult = EndpointResult<typeof uploadsEndpoints.get>;
export type AttachmentResult = EndpointResult<typeof uploadsEndpoints.createAttachment>;
