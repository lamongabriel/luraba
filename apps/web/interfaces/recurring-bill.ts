export type RecurringBillType = "income" | "expense"
export type RecurringBillStatus = "active" | "paused" | "archived"
export type RecurringBillFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly"

export interface RecurringBill {
  id: string
  householdId: string
  ownerUserId: string
  name: string
  description: string | null
  type: RecurringBillType
  status: RecurringBillStatus
  accountId: string
  categoryId: string | null
  merchantId: string | null
  paymentMethodId: string | null
  amount: number
  currencyCode: string
  startDate: string
  endDate: string | null
  frequency: RecurringBillFrequency
  dayOfMonth: number | null
  dayOfWeek: number | null
  createdAt: string
  updatedAt: string
}

export interface RecurringOccurrence {
  id: string
  recurringBillId: string
  occurrenceDate: string
  effectiveDate: string
  status: "scheduled" | "skipped" | "created" | "rescheduled"
  rescheduledDate: string | null
  transactionId: string | null
}
