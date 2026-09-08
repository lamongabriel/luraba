"use client";

import {
  type CreateMerchantInput,
  type CreateMerchantResult,
  type DeleteMerchantResult,
  type GetMerchantResult,
  type ListMerchantsQuery,
  type ListMerchantsResult,
  merchantsEndpoints,
  type UpdateMerchantInput,
  type UpdateMerchantResult,
} from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export function listMerchants(query: ListMerchantsQuery = {}): Promise<ListMerchantsResult> {
  return requestContract(merchantsEndpoints.list, { query });
}

export function getMerchant(id: string): Promise<GetMerchantResult> {
  return requestContract(merchantsEndpoints.get, { params: { id } });
}

export function createMerchant(input: CreateMerchantInput): Promise<CreateMerchantResult> {
  return requestContract(merchantsEndpoints.create, { body: input });
}

export function updateMerchant(
  id: string,
  input: UpdateMerchantInput,
): Promise<UpdateMerchantResult> {
  return requestContract(merchantsEndpoints.update, {
    params: { id },
    body: input,
  });
}

export function deleteMerchant(id: string): Promise<DeleteMerchantResult> {
  return requestContract(merchantsEndpoints.delete, { params: { id } });
}
