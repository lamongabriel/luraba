"use client"

import type {
  ContractSchema,
  EndpointBody,
  EndpointContract,
  EndpointMeta,
  EndpointParams,
  EndpointQuery,
  EndpointResponse,
} from "@luraba/contracts/api"
import {
  apiFailureResponseSchema,
  apiSuccessResponseSchema,
  buildEndpointPath,
} from "@luraba/contracts/api"
import type { AxiosInstance } from "axios"

import { lurabaApiClient } from "@/api/luraba-api"
import { AppClientError } from "@/services/error-client"
import { serializeHttpQuery } from "@/services/http-query"

type ContractResult<T extends EndpointContract> = T extends {
  meta: ContractSchema
}
  ? { data: EndpointResponse<T>; meta: EndpointMeta<T> }
  : EndpointResponse<T>

interface ContractRequestOptions<T extends EndpointContract> {
  body?: EndpointBody<T>
  client?: AxiosInstance
  params?: EndpointParams<T>
  query?: EndpointQuery<T>
}

export async function requestContract<T extends EndpointContract>(
  endpoint: T,
  options: ContractRequestOptions<T> = {},
): Promise<ContractResult<T>> {
  const client = options.client ?? lurabaApiClient
  const parsedParams = endpoint.params?.parse(options.params)
  const url = buildEndpointPath(
    endpoint,
    parsedParams as Record<string, string | number> | undefined,
  )
  const response = await client.request<unknown>({
    method: endpoint.method,
    url,
    data: endpoint.body?.parse(options.body),
    params: endpoint.query
      ? serializeHttpQuery(endpoint.query.parse(options.query ?? {}) as object)
      : undefined,
  })

  if (endpoint.status === 204) return undefined as ContractResult<T>

  if (endpoint.responseEnvelope === "raw") {
    if (!endpoint.response) {
      throw new AppClientError(
        `Contract ${endpoint.method.toUpperCase()} ${endpoint.path} has no response schema`,
        500,
        "INVALID_CONTRACT",
      )
    }
    const parsed = endpoint.response.safeParse(response.data)
    if (!parsed.success) {
      throw new AppClientError(
        `The API response did not match ${endpoint.method.toUpperCase()} ${endpoint.path}`,
        response.status,
        "INVALID_API_RESPONSE",
      )
    }
    return parsed.data as ContractResult<T>
  }

  const failure = apiFailureResponseSchema.safeParse(response.data)
  if (failure.success) {
    throw new AppClientError(
      failure.data.error.message,
      response.status,
      failure.data.error.code,
    )
  }

  if (!endpoint.response) {
    throw new AppClientError(
      `Contract ${endpoint.method.toUpperCase()} ${endpoint.path} has no response schema`,
      500,
      "INVALID_CONTRACT",
    )
  }

  const envelope = apiSuccessResponseSchema(endpoint.response).safeParse(
    response.data,
  )
  if (!envelope.success) {
    throw new AppClientError(
      `The API response did not match ${endpoint.method.toUpperCase()} ${endpoint.path}`,
      response.status,
      "INVALID_API_RESPONSE",
    )
  }

  if (!endpoint.meta) return envelope.data.data as ContractResult<T>
  const meta = endpoint.meta.safeParse(envelope.data.meta)
  if (!meta.success) {
    throw new AppClientError(
      `The API metadata did not match ${endpoint.method.toUpperCase()} ${endpoint.path}`,
      response.status,
      "INVALID_API_RESPONSE",
    )
  }
  return { data: envelope.data.data, meta: meta.data } as ContractResult<T>
}
