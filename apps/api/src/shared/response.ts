import type { ApiResponse, ApiResponseMeta } from "@luraba/contracts/api";
import type { Response } from "express";

export type { ApiResponse, ApiResponseMeta } from "@luraba/contracts/api";

const API_RESPONSE_PAYLOAD = Symbol("api-response-payload");

export interface ApiResponsePayload<T> {
  readonly [API_RESPONSE_PAYLOAD]: true;
  data: T;
  meta?: ApiResponseMeta;
}

export function withApiMeta<T>(data: T, meta?: ApiResponseMeta): ApiResponsePayload<T> {
  return {
    [API_RESPONSE_PAYLOAD]: true,
    data,
    meta,
  };
}

export function isApiResponsePayload(value: unknown): value is ApiResponsePayload<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Partial<ApiResponsePayload<unknown>>)[API_RESPONSE_PAYLOAD] === true
  );
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiResponseMeta,
): void {
  const body: ApiResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}

export function sendError(res: Response, statusCode: number, code: string, message: string): void {
  const body: ApiResponse<never> = {
    success: false,
    error: { code, message },
  };
  res.status(statusCode).json(body);
}
