import type { BaseListHttpQuery, ListResponse } from "@/interfaces/api"
import type { Merchant } from "@/interfaces/merchant"

export type MerchantSortField = "name" | "domain" | "createdAt" | "updatedAt"

export interface ListMerchantsHttpQuery
  extends BaseListHttpQuery<MerchantSortField> {
  hasDomain?: boolean
  hasLogo?: boolean
  createdAtFrom?: string
  createdAtTo?: string
  updatedAtFrom?: string
  updatedAtTo?: string
}

export type ListMerchantsHttpResponse = ListResponse<Merchant>

export interface CreateMerchantHttpBody {
  name: string
  domain?: string
}

export type CreateMerchantHttpResponse = Merchant
export interface UpdateMerchantHttpBody {
  name?: string
  domain?: string | null
}
export type UpdateMerchantHttpResponse = Merchant
