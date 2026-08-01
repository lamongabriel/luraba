import type { BaseListHttpQuery, ListResponse } from "@/interfaces/api"
import type { Tag } from "@/interfaces/tag"

export type TagSortField = "name" | "color" | "icon" | "createdAt" | "updatedAt"

export interface ListTagsHttpQuery extends BaseListHttpQuery<TagSortField> {
  colors?: string[]
  icons?: string[]
  hasColor?: boolean
  hasIcon?: boolean
  createdAtFrom?: string
  createdAtTo?: string
  updatedAtFrom?: string
  updatedAtTo?: string
}

export type ListTagsHttpResponse = ListResponse<Tag>

export interface CreateTagHttpBody {
  name: string
  color?: string
  icon?: string
}

export type CreateTagHttpResponse = Tag
export interface UpdateTagHttpBody {
  name?: string
  color?: string | null
  icon?: string | null
}
export type UpdateTagHttpResponse = Tag
