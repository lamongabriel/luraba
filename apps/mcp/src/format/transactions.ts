import type { TransactionFeedRow } from "@luraba/contracts";
import type { References } from "../resolve/references.js";
import { type Money, toMoney } from "./money.js";

export type TransactionSummary = {
  id: string;
  date: string;
  postedDate: string;
  type: string;
  description: string;
  /** Positive for money in, negative for money out, in the transaction's currency. */
  amount: Money;
  account: string | null;
  toAccount: string | null;
  creditCard: string | null;
  installment: string | null;
  category: string | null;
  merchant: string | null;
  tags: string[];
  paymentMethod: string | null;
  includeInBudget: boolean;
  /** Card purchase rows: pass it to cancel_purchase. */
  purchaseId: string | null;
  /** Refund rows: why the money came back and the purchase it is linked to. */
  refund: { reason: string; originalTransactionId: string | null } | null;
};

type NameMaps = {
  categories: Map<string, string>;
  merchants: Map<string, string>;
  creditCards: Map<string, string>;
};

export async function loadNameMaps(refs: References): Promise<NameMaps> {
  const [categories, merchants, creditCards] = await Promise.all([
    refs.categories(),
    refs.merchants(),
    refs.creditCards(),
  ]);
  return {
    categories: new Map(categories.map((item) => [item.id, item.name])),
    merchants: new Map(merchants.map((item) => [item.id, item.name])),
    creditCards: new Map(creditCards.map((item) => [item.id, item.name])),
  };
}

type RowLike = Pick<
  TransactionFeedRow,
  | "id"
  | "type"
  | "description"
  | "amount"
  | "currencyCode"
  | "accountName"
  | "toAccountName"
  | "categoryId"
  | "merchantId"
  | "paymentMethodName"
  | "tags"
  | "includeInBudget"
  | "purchaseDate"
  | "postedDate"
> &
  Partial<
    Pick<
      TransactionFeedRow,
      | "creditCardId"
      | "installmentNumber"
      | "installmentCount"
      | "originType"
      | "purchaseId"
      | "refund"
    >
  >;

/** Sign convention for agents: income and refunds positive, expenses and card payments negative. */
function signedAmount(row: RowLike): number {
  if (row.type === "income" || row.type === "refund") return Math.abs(row.amount);
  if (row.type === "expense") return -Math.abs(row.amount);
  return row.amount;
}

export function summarizeRow(row: RowLike, names: NameMaps): TransactionSummary {
  return {
    id: row.id,
    date: row.purchaseDate,
    postedDate: row.postedDate,
    type: row.originType && row.originType !== row.type ? row.originType : row.type,
    description: row.description,
    amount: toMoney(signedAmount(row), row.currencyCode),
    account: row.accountName,
    toAccount: row.toAccountName,
    creditCard: row.creditCardId ? (names.creditCards.get(row.creditCardId) ?? null) : null,
    installment:
      row.installmentNumber && row.installmentCount
        ? `${row.installmentNumber}/${row.installmentCount}`
        : null,
    category: row.categoryId ? (names.categories.get(row.categoryId) ?? null) : null,
    merchant: row.merchantId ? (names.merchants.get(row.merchantId) ?? null) : null,
    tags: row.tags.map((tag) => tag.name),
    paymentMethod: row.paymentMethodName,
    includeInBudget: row.includeInBudget,
    purchaseId: row.purchaseId ?? null,
    refund: row.refund
      ? { reason: row.refund.reason, originalTransactionId: row.refund.originalTransactionId }
      : null,
  };
}
