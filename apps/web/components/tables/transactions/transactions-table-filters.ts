import type { TransactionFeedOriginType } from "@luraba/contracts";

export interface TransactionTableFilters {
  dateFrom: string;
  dateTo: string;
  purchaseDateFrom: string;
  purchaseDateTo: string;
  originTypes: string[];
  accountIds: string[];
  creditCardIds: string[];
  categoryIds: string[];
  uncategorized: boolean | null;
  merchantIds: string[];
  tagIds: string[];
  paymentMethodCodes: string[];
  currencyCodes: string[];
  amountMin: number | null;
  amountMax: number | null;
  includeInBudget: boolean | null;
}

export type TransactionTableFilterUpdates = Partial<{
  [Key in keyof TransactionTableFilters]: TransactionTableFilters[Key] | null;
}>;

export const TRANSACTION_FILTERS = {
  dateFrom: { type: "string" },
  dateTo: { type: "string" },
  purchaseDateFrom: { type: "string" },
  purchaseDateTo: { type: "string" },
  originTypes: { type: "stringArray" },
  accountIds: { type: "stringArray" },
  creditCardIds: { type: "stringArray" },
  categoryIds: { type: "stringArray" },
  uncategorized: { type: "boolean" },
  merchantIds: { type: "stringArray" },
  tagIds: { type: "stringArray" },
  paymentMethodCodes: { type: "stringArray" },
  currencyCodes: { type: "stringArray" },
  amountMin: { type: "integer" },
  amountMax: { type: "integer" },
  includeInBudget: { type: "boolean" },
} as const;

export const TRANSACTION_SORT_FIELDS = [
  "amount",
  "createdAt",
  "description",
  "originType",
  "postedDate",
  "purchaseDate",
] as const;

export const TRANSACTION_ORIGIN_TYPE_OPTIONS: Array<{
  value: TransactionFeedOriginType;
  label: string;
}> = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
  { value: "credit_card_installment", label: "Card installment" },
  { value: "credit_card_payment", label: "Card payment" },
];
