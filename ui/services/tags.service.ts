"use client"

import type {
  CreateTagHttpBody,
  CreateTagHttpResponse,
  ListTagsHttpQuery,
  ListTagsHttpResponse,
  UpdateTagHttpBody,
  UpdateTagHttpResponse,
} from "@/interfaces/http/tags-http"
import {
  deleteApiResource,
  getApiList,
  patchApiData,
  postApiData,
} from "@/services/api-client.service"
import { serializeHttpQuery } from "@/services/http-query"

export function listTags(
  query: ListTagsHttpQuery = {},
): Promise<ListTagsHttpResponse> {
  return getApiList("/tags", { params: serializeHttpQuery(query) })
}

export function createTag(
  body: CreateTagHttpBody,
): Promise<CreateTagHttpResponse> {
  return postApiData("/tags", body)
}

export function updateTag({
  id,
  body,
}: {
  id: string
  body: UpdateTagHttpBody
}): Promise<UpdateTagHttpResponse> {
  return patchApiData(`/tags/${id}`, body)
}

export function deleteTag(id: string): Promise<void> {
  return deleteApiResource(`/tags/${id}`)
}
