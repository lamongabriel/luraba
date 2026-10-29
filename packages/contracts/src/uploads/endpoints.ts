import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaSchema } from "../list.js";
import {
  attachmentIdParamsSchema,
  cleanupUploadsBodySchema,
  createAttachmentBodySchema,
  deleteUploadQuerySchema,
  listAttachmentsQuerySchema,
  listUploadsQuerySchema,
  uploadIdParamsSchema,
  uploadScopeQuerySchema,
} from "./requests.js";
import {
  attachmentSchema,
  uploadCleanupResultSchema,
  uploadConfigSchema,
  uploadSchema,
  uploadUsageSchema,
} from "./resource.js";

/**
 * File bytes travel outside these contracts: `POST /uploads` takes a multipart
 * `file` field and `GET /uploads/:id/content` streams the file (see
 * `buildUploadContentPath`).
 */
export const uploadsEndpoints = {
  config: defineEndpoint({
    method: "get",
    path: "/uploads/config",
    response: uploadConfigSchema,
    status: 200,
  }),
  usage: defineEndpoint({
    method: "get",
    path: "/uploads/usage",
    query: uploadScopeQuerySchema,
    response: uploadUsageSchema,
    status: 200,
  }),
  list: defineEndpoint({
    method: "get",
    path: "/uploads",
    query: listUploadsQuerySchema,
    response: z.array(uploadSchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  /** Multipart form with a single `file` field. */
  create: defineEndpoint({
    method: "post",
    path: "/uploads",
    query: uploadScopeQuerySchema,
    response: uploadSchema,
    status: 201,
  }),
  /** Admin tool: removes unused uploads and frees their storage. */
  cleanup: defineEndpoint({
    method: "post",
    path: "/uploads/cleanup",
    query: uploadScopeQuerySchema,
    body: cleanupUploadsBodySchema,
    response: uploadCleanupResultSchema,
    status: 200,
  }),
  get: defineEndpoint({
    method: "get",
    path: "/uploads/:id",
    params: uploadIdParamsSchema,
    response: uploadSchema,
    status: 200,
  }),
  delete: defineEndpoint({
    method: "delete",
    path: "/uploads/:id",
    params: uploadIdParamsSchema,
    query: deleteUploadQuerySchema,
    status: 204,
  }),
  listAttachments: defineEndpoint({
    method: "get",
    path: "/attachments",
    query: listAttachmentsQuerySchema,
    response: z.array(attachmentSchema),
    status: 200,
  }),
  /** Uses an upload for a target. "one" roles replace what was attached before. */
  createAttachment: defineEndpoint({
    method: "post",
    path: "/attachments",
    body: createAttachmentBodySchema,
    response: attachmentSchema,
    status: 201,
  }),
  deleteAttachment: defineEndpoint({
    method: "delete",
    path: "/attachments/:id",
    params: attachmentIdParamsSchema,
    status: 204,
  }),
} as const;
