import type { BaseListHttpQuery, ListResponse } from "@/interfaces/api"
import type {
  RecurringBill,
  RecurringBillFrequency,
  RecurringBillStatus,
  RecurringBillType,
  RecurringOccurrence,
} from "@/interfaces/recurring-bill"

export interface ListRecurringBillsHttpQuery
  extends BaseListHttpQuery<
    "name" | "amount" | "startDate" | "createdAt" | "updatedAt"
  > {
  status?: RecurringBillStatus[]
  type?: RecurringBillType[]
}
export type ListRecurringBillsHttpResponse = ListResponse<RecurringBill>
export interface CreateRecurringBillHttpBody {
  name: string
  description?: string | null
  type: RecurringBillType
  accountId: string
  categoryId?: string | null
  merchantId?: string | null
  paymentMethodCode?: string
  amount: number
  currencyCode: string
  startDate: string
  endDate?: string | null
  frequency: RecurringBillFrequency
  dayOfMonth?: number | null
  dayOfWeek?: number | null
}
export type UpdateRecurringBillHttpBody =
  Partial<CreateRecurringBillHttpBody> & { status?: RecurringBillStatus }
export type CreateRecurringBillHttpResponse = RecurringBill
export type UpdateRecurringBillHttpResponse = RecurringBill
export interface ListRecurringOccurrencesHttpQuery {
  from: string
  to: string
}
export type ListRecurringOccurrencesHttpResponse = RecurringOccurrence[]
