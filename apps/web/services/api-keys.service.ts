"use client";

import {
  apiKeysEndpoints,
  type CreateApiKeyInput,
  type CreateApiKeyResult,
  type ListApiKeysResult,
  type UpdateApiKeyInput,
  type UpdateApiKeyResult,
} from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export function listApiKeys(): Promise<ListApiKeysResult> {
  return requestContract(apiKeysEndpoints.list);
}

export function createApiKey(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
  return requestContract(apiKeysEndpoints.create, { body: input });
}

export function updateApiKey(id: string, input: UpdateApiKeyInput): Promise<UpdateApiKeyResult> {
  return requestContract(apiKeysEndpoints.update, { params: { id }, body: input });
}

export function deleteApiKey(id: string): Promise<void> {
  return requestContract(apiKeysEndpoints.delete, { params: { id } });
}
