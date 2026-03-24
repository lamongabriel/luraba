export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export interface ApiSuccessHttp<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorHttp {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, string>;
  };
}

export type ApiResponseHttp<T = unknown> = ApiSuccessHttp<T> | ApiErrorHttp;
