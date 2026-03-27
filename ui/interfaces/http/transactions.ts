import type { ApiSuccessHttp } from "@/interfaces/http/api-responses";
import type { AccountClassification } from "@/interfaces/http/accounts";

export type TransactionType = "expense" | "income" | "transfer" | "adjustment";

export interface TransactionHttp {
  id: string;
  userId: string;
  type: TransactionType;
  description: string;
  amount: number;
  currencyCode: string;
  accountId: string | null;
  accountName: string | null;
  accountClassification: AccountClassification | null;
  toAccountId: string | null;
  toAccountName: string | null;
  toAccountClassification: AccountClassification | null;
  categoryId: string | null;
  merchantId: string | null;
  paymentMethodId: string | null;
  paymentMethodCode: string | null;
  paymentMethodName: string | null;
  includeInBudget: boolean;
  purchaseDate: string;
  postedDate: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateTransactionHttpParams =
  | {
      type: "expense";
      description: string;
      amount: number;
      currencyCode: string;
      accountId: string;
      paymentMethodCode: string;
      categoryId: string;
      merchantId?: string;
      purchaseDate: string;
      postedDate: string;
      includeInBudget?: boolean;
    }
  | {
      type: "income";
      description: string;
      amount: number;
      currencyCode: string;
      accountId: string;
      paymentMethodCode: string;
      categoryId: string;
      merchantId?: string;
      purchaseDate: string;
      postedDate: string;
      includeInBudget?: boolean;
    }
  | {
      type: "transfer";
      description: string;
      amount: number;
      currencyCode: string;
      fromAccountId: string;
      toAccountId: string;
      purchaseDate: string;
      postedDate: string;
      includeInBudget?: boolean;
    }
  | {
      type: "adjustment";
      description: string;
      amount: number;
      accountId: string;
      direction: "increase" | "decrease";
      purchaseDate: string;
      postedDate: string;
      includeInBudget?: boolean;
    };

export type ListTransactionsHttpResponse = ApiSuccessHttp<TransactionHttp[]>;
export type CreateTransactionHttpResponse = ApiSuccessHttp<TransactionHttp>;
