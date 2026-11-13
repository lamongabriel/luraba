import {
  Calendar01Icon,
  CreditCardIcon,
  Folder01Icon,
  Money03Icon,
  Store01Icon,
  Tag01Icon,
  UserIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TransactionFeedOriginType } from "@luraba/contracts";
import { createElement } from "react";
import type { FilterFieldDef, FilterValues } from "@/components/filters";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";

const icon = (source: Parameters<typeof HugeiconsIcon>[0]["icon"]) =>
  createElement(HugeiconsIcon, { icon: source, strokeWidth: 2, className: "size-3.5" });

export const UNCATEGORIZED = "__uncategorized__";

export const TRANSACTION_FILTER_IDS = [
  "originTypes",
  "accountIds",
  "creditCardIds",
  "categoryIds",
  "merchantIds",
  "tagIds",
  "createdByUserIds",
  "paymentMethodCodes",
  "currencyCodes",
  "amount",
  "purchaseDate",
  "includeInBudget",
] as const;

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
  { value: "refund", label: "Refund" },
];

/** The filter fields of the transactions list, with the household's own options. */
export function buildTransactionFilterDefs(
  lookups: TransactionLookups,
  members: ReadonlyArray<{ userId: string; name: string }>,
): FilterFieldDef[] {
  return [
    {
      id: "originTypes",
      label: "Type",
      kind: "multiselect",
      icon: icon(Money03Icon),
      options: TRANSACTION_ORIGIN_TYPE_OPTIONS,
    },
    {
      id: "accountIds",
      label: "Account",
      kind: "multiselect",
      icon: icon(Wallet01Icon),
      options: lookups.accounts.map((account) => ({
        value: account.id,
        label: `${account.name} · ${account.currencyCode}`,
      })),
    },
    {
      id: "creditCardIds",
      label: "Credit card",
      kind: "multiselect",
      icon: icon(CreditCardIcon),
      options: lookups.creditCards.map((card) => ({
        value: card.id,
        label: `${card.name} · •••• ${card.last4}`,
      })),
    },
    {
      id: "categoryIds",
      label: "Category",
      kind: "multiselect",
      icon: icon(Folder01Icon),
      options: [
        { value: UNCATEGORIZED, label: "Uncategorized" },
        ...lookups.categories.map((category) => ({ value: category.id, label: category.name })),
      ],
    },
    {
      id: "merchantIds",
      label: "Merchant",
      kind: "multiselect",
      icon: icon(Store01Icon),
      options: lookups.merchants.map((merchant) => ({ value: merchant.id, label: merchant.name })),
    },
    {
      id: "tagIds",
      label: "Tag",
      kind: "multiselect",
      icon: icon(Tag01Icon),
      options: lookups.tags.map((tag) => ({ value: tag.id, label: tag.name })),
    },
    {
      id: "createdByUserIds",
      label: "Created by",
      kind: "multiselect",
      icon: icon(UserIcon),
      options: members.map((member) => ({ value: member.userId, label: member.name })),
    },
    {
      id: "paymentMethodCodes",
      label: "Payment method",
      kind: "multiselect",
      options: lookups.paymentMethods.map((method) => ({ value: method.code, label: method.name })),
    },
    {
      id: "currencyCodes",
      label: "Currency",
      kind: "multiselect",
      options: lookups.currencies.map((currency) => ({
        value: currency.code,
        label: currency.code,
      })),
    },
    // Amounts are matched in each transaction's own currency.
    { id: "amount", label: "Amount", kind: "money" },
    { id: "purchaseDate", label: "Purchase date", kind: "date", icon: icon(Calendar01Icon) },
    { id: "includeInBudget", label: "Included in budget", kind: "boolean" },
  ];
}

const toMinor = (amount: number) => Math.round(amount * 100);

/** The active chips as the transactions list query (the endpoint's contract is unchanged). */
export function toTransactionApiParams(values: FilterValues) {
  const params: Record<string, string | number | boolean | string[]> = {};
  const list = (id: string, key = id) => {
    const picked = values.list(id);
    if (picked.length > 0) params[key] = picked;
  };
  list("originTypes");
  list("accountIds");
  list("creditCardIds");
  list("merchantIds");
  list("tagIds");
  list("createdByUserIds");
  list("paymentMethodCodes");
  list("currencyCodes");

  const categories = values.list("categoryIds");
  const categoryIds = categories.filter((id) => id !== UNCATEGORIZED);
  if (categoryIds.length > 0) params.categoryIds = categoryIds;
  if (categories.includes(UNCATEGORIZED)) params.uncategorized = true;

  const { min, max } = values.money("amount");
  if (min !== null) params.amountMin = toMinor(min);
  if (max !== null) params.amountMax = toMinor(max);

  const purchase = values.dates("purchaseDate");
  if (purchase.from) params.purchaseDateFrom = purchase.from;
  if (purchase.to) params.purchaseDateTo = purchase.to;

  const budget = values.flag("includeInBudget");
  if (budget !== null) params.includeInBudget = budget;
  return params;
}
