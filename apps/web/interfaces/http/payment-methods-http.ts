import type { BaseListHttpQuery, ListResponse } from "@/interfaces/api"
import type { PaymentMethod } from "@/interfaces/payment-method"

export type PaymentMethodSortField =
  | "name"
  | "code"
  | "scope"
  | "currencyCode"
  | "createdAt"
  | "updatedAt"

export interface ListPaymentMethodsHttpQuery
  extends BaseListHttpQuery<PaymentMethodSortField> {
  codes?: string[]
  scopes?: Array<PaymentMethod["scope"]>
  currencyCode?: string
  hasCurrency?: boolean
  createdAtFrom?: string
  createdAtTo?: string
  updatedAtFrom?: string
  updatedAtTo?: string
}

export type ListPaymentMethodsHttpResponse = ListResponse<PaymentMethod>

export interface CreatePaymentMethodHttpBody {
  name: string
  code?: string
  currencyCode?: string
  color?: string
  icon?: string
}

export type CreatePaymentMethodHttpResponse = PaymentMethod
export interface UpdatePaymentMethodHttpBody {
  name?: string
  code?: string
  currencyCode?: string | null
  color?: string | null
  icon?: string | null
}
export type UpdatePaymentMethodHttpResponse = PaymentMethod
