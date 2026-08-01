import type { BaseListHttpQuery, ListResponse } from "@/interfaces/api"
import type {
  CreateCreditCardPaymentBody,
  CreateCreditCardPurchaseBody,
  CreditCard,
  CreditCardCycle,
  CreditCardCycleDetails,
  CreditCardCycleDisplayStatus,
  CreditCardCycleStatus,
  CreditCardForecast,
  CreditCardPayment,
  CreditCardPurchase,
  UpdateCreditCardPaymentBody,
  UpdateCreditCardPurchaseBody,
} from "@/interfaces/credit-card"

export type CreditCardSortField =
  | "name"
  | "institutionName"
  | "brand"
  | "last4"
  | "currencyCode"
  | "balance"
  | "creditLimitAmount"
  | "closingDay"
  | "dueDay"
  | "createdAt"
  | "updatedAt"

export interface ListCreditCardsHttpQuery
  extends BaseListHttpQuery<CreditCardSortField> {
  brands?: string[]
  currencyCodes?: string[]
  accountIds?: string[]
  closingDays?: number[]
  dueDays?: number[]
  balanceMin?: number
  balanceMax?: number
  creditLimitMin?: number
  creditLimitMax?: number
  hasCreditLimit?: boolean
  createdAtFrom?: string
  createdAtTo?: string
  updatedAtFrom?: string
  updatedAtTo?: string
}

export type ListCreditCardsHttpResponse = ListResponse<CreditCard>
export type GetCreditCardHttpResponse = CreditCard

export interface CreateCreditCardHttpBody {
  name: string
  institutionName?: string
  institutionDomain?: string
  notes?: string
  currencyCode: string
  brand: string
  last4: string
  color?: string
  closingDay: number
  dueDay: number
  creditLimitAmount?: number
}

export type CreateCreditCardHttpResponse = CreditCard
export interface UpdateCreditCardHttpBody {
  name?: string
  institutionName?: string | null
  institutionDomain?: string | null
  notes?: string | null
  brand?: string
  last4?: string
  color?: string | null
  closingDay?: number
  dueDay?: number
  creditLimitAmount?: number
}
export type UpdateCreditCardHttpResponse = CreditCard

export type CreditCardCycleSortField =
  | "periodStart"
  | "periodEnd"
  | "closingDate"
  | "dueDate"
  | "status"
  | "displayStatus"
  | "statementAmount"
  | "paidAmount"
  | "remainingAmount"

export interface ListCreditCardCyclesHttpQuery
  extends BaseListHttpQuery<CreditCardCycleSortField> {
  scope?: "default" | "all"
  statuses?: CreditCardCycleStatus[]
  displayStatuses?: CreditCardCycleDisplayStatus[]
  closingDateFrom?: string
  closingDateTo?: string
  dueDateFrom?: string
  dueDateTo?: string
  statementAmountMin?: number
  statementAmountMax?: number
  paidAmountMin?: number
  paidAmountMax?: number
  remainingAmountMin?: number
  remainingAmountMax?: number
}

export type ListCreditCardCyclesHttpResponse = ListResponse<CreditCardCycle>
export type GetCreditCardCycleHttpResponse = CreditCardCycleDetails
export interface UpdateCreditCardCycleHttpBody {
  closingDate?: string
  dueDate?: string
}
export type UpdateCreditCardCycleHttpResponse = CreditCardCycleDetails

export type CreateCreditCardPurchaseHttpBody = CreateCreditCardPurchaseBody
export type CreateCreditCardPurchaseHttpResponse = CreditCardPurchase
export type UpdateCreditCardPurchaseHttpBody = UpdateCreditCardPurchaseBody
export type UpdateCreditCardPurchaseHttpResponse = CreditCardPurchase
export type GetCreditCardPurchaseHttpResponse = CreditCardPurchase
export type CreateCreditCardPaymentHttpBody = CreateCreditCardPaymentBody
export type CreateCreditCardPaymentHttpResponse = CreditCardPayment
export type UpdateCreditCardPaymentHttpBody = UpdateCreditCardPaymentBody
export type UpdateCreditCardPaymentHttpResponse = CreditCardPayment
export type GetCreditCardPaymentHttpResponse = CreditCardPayment

export interface GetCreditCardForecastHttpQuery {
  fromMonth?: string
  months?: number
}

export type GetCreditCardForecastHttpResponse = CreditCardForecast
