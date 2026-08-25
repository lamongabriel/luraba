export interface CreditCard {
  id: string
  ownerAccountId: string
  ledgerAccountId: string
  name: string
  institutionName: string | null
  institutionDomain: string | null
  institutionLogoUrl: string | null
  notes: string | null
  ownerAccount: {
    id: string
    name: string
    institutionName: string | null
    institutionLogoUrl: string | null
    type: "cash"
    classification: "asset"
    currencyCode: string
  }
  classification: "liability"
  type: "credit_card"
  currencyCode: string
  brand: string
  productType: "credit"
  last4: string
  color: string | null
  closingDay: number
  dueDay: number
  creditLimitAmount: number
  remainingCreditAmount: number | null
  balance: number
  createdAt: string
  updatedAt: string
}

export type CreditCardCycleStatus = "open" | "closed" | "paid"
export type CreditCardCycleDisplayStatus =
  | "current"
  | "upcoming"
  | "due"
  | "overdue"
  | "paid"

export interface CreditCardCycle {
  id: string
  creditCardId: string
  periodStart: string
  periodEnd: string
  closingDate: string
  dueDate: string
  status: CreditCardCycleStatus
  statementAmount: number
  paidAmount: number
  remainingAmount: number
  displayStatus: CreditCardCycleDisplayStatus
  isCurrent: boolean
  isNext: boolean
  hasActivity: boolean
}

export interface CreditCardCycleItem {
  installmentId: string
  purchaseId: string
  transactionId: string
  description: string
  categoryId: string | null
  merchantId: string | null
  installmentNumber: number
  installmentCount: number
  amount: number
  purchaseDate: string
  postedDate: string
}

export interface CreditCardCycleDetails {
  cycle: CreditCardCycle
  items: CreditCardCycleItem[]
}

export interface CreditCardForecast {
  creditCardId: string
  fromMonth: string
  months: number
  cycles: Array<CreditCardCycle & { items: CreditCardCycleItem[] }>
}

export interface CreditCardPurchaseInstallment {
  installmentId: string
  installmentNumber: number
  amount: number
  billingCycleId: string
  closingDate: string
  dueDate: string
}

export interface CreditCardPurchase {
  purchaseId: string
  creditCardId: string
  transactionId: string
  description: string
  categoryId: string | null
  merchantId: string | null
  purchaseDate: string
  postedDate: string
  amount: number
  installmentCount: number
  tags: Array<{
    id: string
    name: string
    color: string | null
    icon: string | null
  }>
  includeInBudget: boolean
  budgetExpenseTiming: "spend_month" | "payment_month"
  budgetInstallmentMode: "per_installment" | "full_amount"
  installments: CreditCardPurchaseInstallment[]
  createdAt: string
}

export interface CreditCardPayment {
  paymentId: string
  creditCardId: string
  transactionId: string
  description: string
  paymentDate: string
  postedDate: string
  amount: number
  fromAccountId: string
  allocations: Array<{
    billingCycleId: string
    amount: number
  }>
  createdAt: string
}

export interface CreateCreditCardPurchaseBody {
  description: string
  amount: number
  categoryId?: string | null
  merchantId?: string
  purchaseDate: string
  postedDate?: string
  installmentCount?: number
  tagIds?: string[]
  includeInBudget?: boolean
}

export interface UpdateCreditCardPurchaseBody {
  description?: string
  amount?: number
  categoryId?: string | null
  merchantId?: string | null
  purchaseDate?: string
  postedDate?: string
  installmentCount?: number
  tagIds?: string[]
  includeInBudget?: boolean
}

export interface CreateCreditCardPaymentBody {
  description?: string
  amount: number
  fromAccountId: string
  paymentDate: string
  postedDate?: string
}

export interface UpdateCreditCardPaymentBody {
  description?: string
  amount?: number
  fromAccountId?: string
  paymentDate?: string
  postedDate?: string
}
