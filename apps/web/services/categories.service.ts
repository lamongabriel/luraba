"use client"

import type {
  CreateCategoryHttpBody,
  CreateCategoryHttpResponse,
  ListCategoriesHttpQuery,
  ListCategoriesHttpResponse,
  UpdateCategoryHttpBody,
  UpdateCategoryHttpResponse,
} from "@/interfaces/http/categories-http"
import {
  deleteApiResource,
  getApiList,
  patchApiData,
  postApiData,
} from "@/services/api-client.service"
import { serializeHttpQuery } from "@/services/http-query"

export function listCategories(
  query: ListCategoriesHttpQuery = {},
): Promise<ListCategoriesHttpResponse> {
  return getApiList("/categories", { params: serializeHttpQuery(query) })
}

export function createCategory(
  body: CreateCategoryHttpBody,
): Promise<CreateCategoryHttpResponse> {
  return postApiData("/categories", body)
}

export function updateCategory({
  id,
  body,
}: {
  id: string
  body: UpdateCategoryHttpBody
}): Promise<UpdateCategoryHttpResponse> {
  return patchApiData(`/categories/${id}`, body)
}

export function deleteCategory(id: string): Promise<void> {
  return deleteApiResource(`/categories/${id}`)
}
