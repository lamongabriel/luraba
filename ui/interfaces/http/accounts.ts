import type { ApiSuccessHttp } from "@/interfaces/http/api-responses";

export type AccountClassification = "asset" | "liability";

export type AccountType =
  | "depository"
  | "loan"
  | "credit_card"
  | "property"
  | "vehicle"
  | "other_asset"
  | "other_liability";

export interface AccountHttp {
  id: string;
  userId: string;
  name: string;
  institutionName: string | null;
  institutionDomain: string | null;
  notes: string | null;
  classification: AccountClassification;
  type: AccountType;
  currencyCode: string;
  createdAt: string;
  updatedAt: string;
  balance: number;
}

export interface CreateAccountHttpParams {
  name: string;
  institutionName?: string;
  institutionDomain?: string;
  notes?: string;
  classification: Exclude<AccountClassification, never>;
  type: Exclude<AccountType, "credit_card">;
  currencyCode: string;
}

export interface AccountHistoryItemHttp {
  entryId: string;
  transactionId: string;
  type: "expense" | "income" | "transfer" | "adjustment";
  paymentMethodId: string | null;
  paymentMethodCode: string | null;
  paymentMethodName: string | null;
  description: string;
  amount: number;
  currencyCode: string;
  merchantId: string | null;
  categoryId: string | null;
  purchaseDate: string;
  postedDate: string;
  createdAt: string;
}

export interface AccountHistoryHttp {
  account: Omit<AccountHttp, "balance">;
  balance: number;
  items: AccountHistoryItemHttp[];
}

export type ListAccountsHttpResponse = ApiSuccessHttp<AccountHttp[]>;
export type CreateAccountHttpResponse = ApiSuccessHttp<Omit<AccountHttp, "balance">>;
export type GetAccountHistoryHttpResponse = ApiSuccessHttp<AccountHistoryHttp>;
