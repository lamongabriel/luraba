"use client"

import type { AxiosInstance, AxiosRequestConfig } from "axios"

import { lurabaApiClient } from "@/api/luraba-api"
import type { ApiResponse, ListResponse } from "@/interfaces/api"
import { getApiListResponse, getApiResponseData } from "@/services/error-client"

export async function getApiData<TData>(
  url: string,
  config?: AxiosRequestConfig,
  client: AxiosInstance = lurabaApiClient,
): Promise<TData> {
  const response = await client.get<ApiResponse<TData>>(url, config)
  return getApiResponseData(response.data)
}

export async function getApiList<TData, TSummary = never>(
  url: string,
  config?: AxiosRequestConfig,
  client: AxiosInstance = lurabaApiClient,
): Promise<ListResponse<TData, TSummary>> {
  const response = await client.get<ApiResponse<TData[]>>(url, config)
  return getApiListResponse<TData, TSummary>(response.data)
}

export async function postApiData<TData, TBody = unknown>(
  url: string,
  body?: TBody,
): Promise<TData> {
  const response = await lurabaApiClient.post<ApiResponse<TData>>(url, body)
  return getApiResponseData(response.data)
}

export async function postApiResource<TBody = unknown>(
  url: string,
  body?: TBody,
): Promise<void> {
  await lurabaApiClient.post(url, body)
}

export async function putApiData<TData, TBody = unknown>(
  url: string,
  body?: TBody,
): Promise<TData> {
  const response = await lurabaApiClient.put<ApiResponse<TData>>(url, body)
  return getApiResponseData(response.data)
}

export async function patchApiData<TData, TBody = unknown>(
  url: string,
  body?: TBody,
): Promise<TData> {
  const response = await lurabaApiClient.patch<ApiResponse<TData>>(url, body)
  return getApiResponseData(response.data)
}

export async function deleteApiData<TData>(url: string): Promise<TData> {
  const response = await lurabaApiClient.delete<ApiResponse<TData>>(url)
  return getApiResponseData(response.data)
}

export async function deleteApiResource(url: string): Promise<void> {
  await lurabaApiClient.delete(url)
}
