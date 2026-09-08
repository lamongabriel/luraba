"use client";

import {
  type CreateTagInput,
  type CreateTagResult,
  type DeleteTagResult,
  type ListTagsQuery,
  type ListTagsResult,
  tagsEndpoints,
  type UpdateTagInput,
  type UpdateTagResult,
} from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export function listTags(query: ListTagsQuery = {}): Promise<ListTagsResult> {
  return requestContract(tagsEndpoints.list, { query });
}

export function createTag(input: CreateTagInput): Promise<CreateTagResult> {
  return requestContract(tagsEndpoints.create, { body: input });
}

export function updateTag(id: string, input: UpdateTagInput): Promise<UpdateTagResult> {
  return requestContract(tagsEndpoints.update, { params: { id }, body: input });
}

export function deleteTag(id: string): Promise<DeleteTagResult> {
  return requestContract(tagsEndpoints.delete, { params: { id } });
}
