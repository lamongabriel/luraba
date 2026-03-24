import type { ApiSuccessHttp } from "@/interfaces/http/api-responses";

export interface TransactionHttp {
  id: number;
  userId: number;
  type:
    | "expense"
    | "income"
    | "transfer"
    | "card_purchase"
    | "card_payment"
    | "installment"
    | "adjustment";
  paymentMethod: "cash" | "debit" | "pix" | "boleto" | "credit_card" | null;
  description: string;
  isExcluded: boolean;
  isOneTimeTransaction: boolean;
  merchantId: number | null;
  purchaseDate: string;
  postedDate: string;
  createdAt: string;
  updatedAt: string;
}

export type ListTransactionsHttpResponse = ApiSuccessHttp<TransactionHttp[]>;
