"use client"

import {
  type CreateCategoryInput,
  type CreateCategoryResult,
  categoriesEndpoints,
  type DeleteCategoryResult,
  type ListCategoriesQuery,
  type ListCategoriesResult,
  type UpdateCategoryInput,
  type UpdateCategoryResult,
} from "@luraba/contracts"
import { requestContract } from "@/services/contract-client.service"

export function listCategories(
  query: ListCategoriesQuery = {},
): Promise<ListCategoriesResult> {
  return requestContract(categoriesEndpoints.list, { query })
}

export function createCategory(
  input: CreateCategoryInput,
): Promise<CreateCategoryResult> {
  return requestContract(categoriesEndpoints.create, { body: input })
}

export function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<UpdateCategoryResult> {
  return requestContract(categoriesEndpoints.update, {
    params: { id },
    body: input,
  })
}

export function deleteCategory(id: string): Promise<DeleteCategoryResult> {
  return requestContract(categoriesEndpoints.delete, { params: { id } })
}
