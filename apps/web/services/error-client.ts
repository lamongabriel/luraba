"use client"

import type { ApiError, ApiFailureResponse } from "@luraba/contracts"
import axios from "axios"

export class AppClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message)
    this.name = "AppClientError"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isApiErrorPayload(value: unknown): value is ApiError {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.message === "string"
  )
}

function isApiFailureResponse(value: unknown): value is ApiFailureResponse {
  return (
    isRecord(value) && value.success === false && isApiErrorPayload(value.error)
  )
}

function extractErrorPayload(value: unknown): ApiError | null {
  if (isApiErrorPayload(value)) {
    return value
  }

  if (isApiFailureResponse(value)) {
    return value.error
  }

  if (isRecord(value) && "error" in value) {
    return extractErrorPayload(value.error)
  }

  return null
}

function extractErrorMessage(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value
  }

  if (
    isRecord(value) &&
    typeof value.message === "string" &&
    value.message.trim()
  ) {
    return value.message
  }

  return null
}

export function toAppClientError(error: unknown) {
  if (error instanceof AppClientError) {
    return error
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 500
    const payload = extractErrorPayload(error.response?.data)

    if (payload) {
      return new AppClientError(payload.message, status, payload.code)
    }

    return new AppClientError(
      error.message || "Request failed",
      status,
      "REQUEST_FAILED",
    )
  }

  if (error instanceof Error) {
    const record = error as Error & {
      error?: unknown
      status?: number
    }
    const status = typeof record.status === "number" ? record.status : 500
    const payload = extractErrorPayload(record.error)

    if (payload) {
      return new AppClientError(payload.message, status, payload.code)
    }

    const nestedMessage = extractErrorMessage(record.error)
    if (nestedMessage) {
      return new AppClientError(nestedMessage, status, "UNKNOWN_ERROR")
    }

    return new AppClientError(error.message, status, "UNKNOWN_ERROR")
  }

  const message = extractErrorMessage(error)
  if (message) {
    return new AppClientError(message, 500, "UNKNOWN_ERROR")
  }

  return new AppClientError(
    "An unexpected error occurred",
    500,
    "UNKNOWN_ERROR",
  )
}

export function getAppErrorDetails(error: unknown, fallbackMessage: string) {
  const appError = toAppClientError(error)

  return {
    appError,
    errorMessage: appError.message || fallbackMessage,
  }
}

export function getAppErrorMessage(error: unknown, fallbackMessage: string) {
  return getAppErrorDetails(error, fallbackMessage).errorMessage
}
