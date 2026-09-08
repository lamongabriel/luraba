"use client";
import {
  type DeleteBrandfetchIntegrationResult,
  integrationsEndpoints,
  type ListIntegrationsQuery,
  type ListIntegrationsResult,
  type UpdateBrandfetchIntegrationInput,
  type UpdateBrandfetchIntegrationResult,
} from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export function listIntegrations(
  query: ListIntegrationsQuery = {},
): Promise<ListIntegrationsResult> {
  return requestContract(integrationsEndpoints.list, { query });
}

export function updateBrandfetchIntegration(
  input: UpdateBrandfetchIntegrationInput,
): Promise<UpdateBrandfetchIntegrationResult> {
  return requestContract(integrationsEndpoints.updateBrandfetch, {
    body: input,
  });
}

export function deleteBrandfetchIntegration(): Promise<DeleteBrandfetchIntegrationResult> {
  return requestContract(integrationsEndpoints.deleteBrandfetch);
}
