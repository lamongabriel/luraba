export interface ApiError {
  code: string
  message: string
}

export type SortDirection = "asc" | "desc"

/** Maximum `perPage` accepted by the API (see `api/src/shared/list.ts`). Use
 * this when a page/picker needs to fetch effectively everything at once
 * (e.g. flat lists like categories/tags) instead of hardcoding the number. */
export const MAX_PER_PAGE = 1000

export interface BaseListHttpQuery<TSort extends string = string> {
  page?: number
  perPage?: number
  search?: string
  sort?: TSort
  sortDirection?: SortDirection
}

export interface PaginationMeta {
  page: number
  perPage: number
  totalCount: number
  totalPages: number
}

export interface ListMeta<TSummary = never> {
  pagination: PaginationMeta
  summary?: TSummary
}

export interface ListResponse<TData, TSummary = never> {
  data: TData[]
  meta: ListMeta<TSummary>
}

export interface ApiResponseMeta {
  pagination?: PaginationMeta
  summary?: unknown
  [key: string]: unknown
}

export interface ApiFailureResponse {
  success: false
  error: ApiError
  meta?: ApiResponseMeta
}

export interface ApiSuccessResponse<TData> {
  success: true
  data: TData
  meta?: ApiResponseMeta
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiFailureResponse
