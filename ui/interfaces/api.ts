export interface ApiError {
  code: string
  message: string
}

export interface ApiFailureResponse {
  success: false
  error: ApiError
  meta?: Record<string, unknown>
}

export interface ApiSuccessResponse<TData> {
  success: true
  data: TData
  meta?: Record<string, unknown>
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiFailureResponse
