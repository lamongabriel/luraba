"use client"

import type {
  DeleteBrandfetchIntegrationHttpResponse,
  ListIntegrationsHttpQuery,
  ListIntegrationsHttpResponse,
  UpdateBrandfetchIntegrationHttpBody,
  UpdateBrandfetchIntegrationHttpResponse,
} from "@/interfaces/http/integrations-http"
import {
  deleteApiData,
  getApiList,
  putApiData,
} from "@/services/api-client.service"
import { serializeHttpQuery } from "@/services/http-query"

export function listIntegrations(
  query: ListIntegrationsHttpQuery = {},
): Promise<ListIntegrationsHttpResponse> {
  return getApiList("/integrations", { params: serializeHttpQuery(query) })
}

export function updateBrandfetchIntegration(
  body: UpdateBrandfetchIntegrationHttpBody,
): Promise<UpdateBrandfetchIntegrationHttpResponse> {
  return putApiData("/integrations/brandfetch", body)
}

export function deleteBrandfetchIntegration(): Promise<DeleteBrandfetchIntegrationHttpResponse> {
  return deleteApiData("/integrations/brandfetch")
}
