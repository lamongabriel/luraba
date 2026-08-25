import type { BaseListHttpQuery, ListResponse } from "@/interfaces/api"
import type { Category } from "@/interfaces/category"

export type CategorySortField = "name" | "type" | "createdAt" | "updatedAt"

export interface ListCategoriesHttpQuery
  extends BaseListHttpQuery<CategorySortField> {
  types?: Array<Category["type"]>
  parentIds?: string[]
  hasParent?: boolean
  colors?: string[]
  icons?: string[]
  createdAtFrom?: string
  createdAtTo?: string
  updatedAtFrom?: string
  updatedAtTo?: string
}

export type ListCategoriesHttpResponse = ListResponse<Category>

export interface CreateCategoryHttpBody {
  name: string
  parentId?: string
  type: Category["type"]
  color?: string
  icon?: string
}

export type CreateCategoryHttpResponse = Category
export type UpdateCategoryHttpBody = Partial<
  Omit<CreateCategoryHttpBody, "parentId">
> & { parentId?: string | null; color?: string | null; icon?: string | null }
export type UpdateCategoryHttpResponse = Category
