import {
  Calendar01Icon,
  CoinsDollarIcon,
  CreditCardIcon,
  CreditCardPosIcon,
  DollarCircleIcon,
  Folder01Icon,
  Money03Icon,
  PiggyBankIcon,
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
      icon: icon(CreditCardPosIcon),
      options: lookups.paymentMethods.map((method) => ({ value: method.code, label: method.name })),
    },
    {
      id: "currencyCodes",
      label: "Currency",
      kind: "multiselect",
      icon: icon(DollarCircleIcon),
      options: lookups.currencies.map((currency) => ({
        value: currency.code,
        label: currency.code,
      })),
    },
    // Amounts are matched in each transaction's own currency.
    { id: "amount", label: "Amount", kind: "money", icon: icon(CoinsDollarIcon) },
    { id: "purchaseDate", label: "Purchase date", kind: "date", icon: icon(Calendar01Icon) },
    {
      id: "includeInBudget",
      label: "Included in budget",
      kind: "boolean",
      icon: icon(PiggyBankIcon),
    },
  ];
}

const toMinor = (amount: number) => Math.round(amount * 100);

/** The active chips as the transactions list query (the endpoint's contract is unchanged). */
export function toTransactionApiParams(values: FilterValues) {
  const params: Record<string, string | number | boolean | string[]> = {};
  const list = (id: string, key = id) => {
    const picked = values.list(id);
    if (picked.length > 0) params[key] = picked;
    const none = values.excluded(id);
    if (none.length > 0) params[`exclude${key.charAt(0).toUpperCase()}${key.slice(1)}`] = none;
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
  // "Is none of" categories: the rows with a category outside the list, plus the uncategorized ones unless excluded.
  const noCategories = values.excluded("categoryIds");
  const excludedCategoryIds = noCategories.filter((id) => id !== UNCATEGORIZED);
  if (excludedCategoryIds.length > 0) params.excludeCategoryIds = excludedCategoryIds;
  if (noCategories.includes(UNCATEGORIZED)) params.excludeUncategorized = true;

  const { min, max, minExclusive, maxExclusive } = values.money("amount");
  // Amounts are whole minor units, so "greater than" is one unit above and "less than" one below.
  if (min !== null) params.amountMin = toMinor(min) + (minExclusive ? 1 : 0);
  if (max !== null) params.amountMax = Math.max(0, toMinor(max) - (maxExclusive ? 1 : 0));

  const purchase = values.dates("purchaseDate");
  if (purchase.from) params.purchaseDateFrom = purchase.from;
  if (purchase.to) params.purchaseDateTo = purchase.to;

  const budget = values.flag("includeInBudget");
  if (budget !== null) params.includeInBudget = budget;
  return params;
}
