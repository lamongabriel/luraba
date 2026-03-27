import type { ApiSuccessHttp } from "@/interfaces/http/api-responses";

export interface CreditCardHttp {
  id: string;
  accountId: string;
  userId: string;
  name: string;
  institutionName: string | null;
  institutionDomain: string | null;
  notes: string | null;
  classification: "liability";
  type: "credit_card";
  currencyCode: string;
  brand: string;
  productType: "credit";
  last4: string;
  color: string | null;
  closingDay: number;
  dueDay: number;
  unappliedCreditAmount: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCardCycleSummaryHttp {
  id: string;
  creditCardId: string;
  periodStart: string;
  periodEnd: string;
  closingDate: string;
  dueDate: string;
  status: "open" | "closed" | "paid";
  statementAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

export interface CreditCardCycleItemHttp {
  installmentId: string;
  purchaseId: string;
  transactionId: string;
  description: string;
  categoryId: string | null;
  merchantId: string | null;
  installmentNumber: number;
  installmentCount: number;
  amount: number;
  purchaseDate: string;
  postedDate: string;
}

export interface CreditCardCycleDetailHttp {
  cycle: CreditCardCycleSummaryHttp;
  items: CreditCardCycleItemHttp[];
}

export interface CreditCardForecastHttp {
  creditCardId: string;
  fromMonth: string;
  months: number;
  unappliedCreditAmount: number;
  cycles: Array<CreditCardCycleSummaryHttp & { items: CreditCardCycleItemHttp[] }>;
}

export interface CreateCreditCardHttpParams {
  name: string;
  institutionName?: string;
  institutionDomain?: string;
  notes?: string;
  currencyCode: string;
  brand: string;
  productType?: "credit";
  last4: string;
  color?: string;
  closingDay: number;
  dueDay: number;
}

export interface UpdateCreditCardHttpParams {
  name?: string;
  institutionName?: string | null;
  institutionDomain?: string | null;
  notes?: string | null;
  brand?: string;
  productType?: "credit";
  last4?: string;
  color?: string | null;
  closingDay?: number;
  dueDay?: number;
}

export interface CreateCreditCardPurchaseHttpParams {
  description: string;
  amount: number;
  categoryId: string;
  merchantId?: string;
  purchaseDate: string;
  postedDate?: string;
  installmentCount?: number;
}

export interface CreateCreditCardPaymentHttpParams {
  description?: string;
  amount: number;
  fromAccountId: string;
  paymentDate: string;
  postedDate?: string;
}

export interface UpdateCreditCardCycleHttpParams {
  periodStart?: string;
  periodEnd?: string;
  closingDate?: string;
  dueDate?: string;
}

export interface CreditCardPurchaseHttp {
  purchaseId: string;
  creditCardId: string;
  transactionId: string;
  amount: number;
  installmentCount: number;
  budgetExpenseTiming: "spend_month" | "payment_month";
  budgetInstallmentMode: "per_installment" | "full_amount";
  installments: Array<{
    installmentId: string;
    installmentNumber: number;
    amount: number;
    billingCycleId: string;
    closingDate: string;
    dueDate: string;
  }>;
  createdAt: string;
}

export interface CreditCardPaymentHttp {
  paymentId: string;
  creditCardId: string;
  transactionId: string;
  amount: number;
  fromAccountId: string;
  allocations: Array<{
    billingCycleId: string | null;
    amount: number;
  }>;
  unappliedCreditAmount: number;
  createdAt: string;
}

export type ListCreditCardsHttpResponse = ApiSuccessHttp<CreditCardHttp[]>;
export type GetCreditCardHttpResponse = ApiSuccessHttp<CreditCardHttp>;
export type CreateCreditCardHttpResponse = ApiSuccessHttp<CreditCardHttp>;
export type UpdateCreditCardHttpResponse = ApiSuccessHttp<CreditCardHttp>;
export type ListCreditCardCyclesHttpResponse = ApiSuccessHttp<CreditCardCycleSummaryHttp[]>;
export type GetCreditCardCycleHttpResponse = ApiSuccessHttp<CreditCardCycleDetailHttp>;
export type UpdateCreditCardCycleHttpResponse = ApiSuccessHttp<CreditCardCycleDetailHttp>;
export type CreateCreditCardPurchaseHttpResponse = ApiSuccessHttp<CreditCardPurchaseHttp>;
export type CreateCreditCardPaymentHttpResponse = ApiSuccessHttp<CreditCardPaymentHttp>;
export type GetCreditCardForecastHttpResponse = ApiSuccessHttp<CreditCardForecastHttp>;
