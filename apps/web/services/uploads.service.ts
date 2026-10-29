"use client";

import {
  type CreateAttachmentInput,
  type ListAttachmentsQuery,
  type ListUploadsQuery,
  uploadsEndpoints,
} from "@luraba/contracts";
import { apiSuccessResponseSchema } from "@luraba/contracts/api";
import { lurabaApiClient } from "@/api/luraba-api";
import { requestContract } from "@/services/contract-client.service";
import { AppClientError } from "@/services/error-client";

export type UploadScope = "user" | "household";

export function getUploadConfig() {
  return requestContract(uploadsEndpoints.config);
}

export function listUploads(query: ListUploadsQuery = {}) {
  return requestContract(uploadsEndpoints.list, { query });
}

export function getUploadUsage(scope: UploadScope = "household") {
  return requestContract(uploadsEndpoints.usage, { query: { scope } });
}

/** Sends one file as multipart/form-data. The body is not a JSON contract, so it is built by hand. */
export async function uploadFile(file: File | Blob, scope: UploadScope, filename?: string) {
  const form = new FormData();
  form.append("file", file, filename ?? (file instanceof File ? file.name : "upload"));

  const response = await lurabaApiClient.post<unknown>("/uploads", form, { params: { scope } });
  const envelope = apiSuccessResponseSchema(uploadsEndpoints.create.response).safeParse(
    response.data,
  );
  if (!envelope.success) {
    throw new AppClientError(
      "The API response did not match POST /uploads",
      response.status,
      "INVALID_API_RESPONSE",
    );
  }
  return envelope.data.data;
}

export function deleteUpload(id: string, force = false) {
  return requestContract(uploadsEndpoints.delete, { params: { id }, query: { force } });
}

export function cleanupUploads(
  scope: UploadScope,
  body: { olderThanDays?: number; dryRun?: boolean },
) {
  return requestContract(uploadsEndpoints.cleanup, { query: { scope }, body });
}

export function listAttachments(query: ListAttachmentsQuery) {
  return requestContract(uploadsEndpoints.listAttachments, { query });
}

export function createAttachment(input: CreateAttachmentInput) {
  return requestContract(uploadsEndpoints.createAttachment, { body: input });
}

export function deleteAttachment(id: string) {
  return requestContract(uploadsEndpoints.deleteAttachment, { params: { id } });
}
