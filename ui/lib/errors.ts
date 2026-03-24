import type { ErrorCode } from "@/interfaces/http/api-responses";

type ApiErrorDetails = {
  code: ErrorCode;
  message: string;
  details?: Record<string, string>;
  status?: number;
};

export class ApiError extends Error {
  code: ErrorCode;
  details?: Record<string, string>;
  status?: number;

  constructor(errorDetails: ApiErrorDetails) {
    super(errorDetails.message);
    this.name = "ApiError";
    this.code = errorDetails.code;
    this.details = errorDetails.details;
    this.status = errorDetails.status;
  }

  isExpectedError(): boolean {
    return ["VALIDATION_ERROR", "UNAUTHORIZED", "CONFLICT"].includes(this.code);
  }

  isUnexpectedError(): boolean {
    return !this.isExpectedError();
  }

  hasFieldErrors(): boolean {
    return this.code === "VALIDATION_ERROR" && !!this.details;
  }
}

export class NetworkError extends Error {
  constructor(message = "Unable to connect to the server. Please try again.") {
    super(message);
    this.name = "NetworkError";
  }
}
