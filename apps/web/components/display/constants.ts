import {
  Airplane01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  BitcoinCircleIcon,
  Building03Icon,
  Bus01Icon,
  Car01Icon,
  CreditCardIcon,
  DashboardSquare01Icon,
  DeliveryTruck01Icon,
  DollarCircleIcon,
  Exchange01Icon,
  Home01Icon,
  Motorbike01Icon,
  PieChart02Icon,
  PiggyBankIcon,
  SlidersHorizontalIcon,
  Store01Icon,
  WalletIcon,
} from "@hugeicons/core-free-icons";
import type { HugeiconsIcon } from "@hugeicons/react";
import type {
  AccountSubtype,
  AccountType,
  TransactionFeedOriginType,
  TransactionType,
} from "@luraba/contracts";

import { ACCOUNT_TYPE_LABELS } from "@/lib/accounts";

/**
 * The single place that decides how things look across the app. Change an icon, a color, a label
 * or a size here and every table, drawer and card follows. Components in this folder read these
 * catalogs; nothing else should hard-code them.
 */

export type DisplayIcon = React.ComponentProps<typeof HugeiconsIcon>["icon"];

/* ------------------------------------------------------------------ sizes */

export type DisplaySize = "xs" | "sm" | "md" | "lg";

export const DISPLAY_SIZES: Record<
  DisplaySize,
  {
    /** The round/square picture or icon tile. */
    mark: string;
    /** Glyph inside the tile. */
    glyph: string;
    text: string;
    subtext: string;
    gap: string;
    /** Maps onto `components/ui/icon` sizes. */
    iconSize: "xs" | "sm" | "md" | "lg";
  }
> = {
  xs: {
    mark: "size-4",
    glyph: "size-2.5",
    text: "text-xs",
    subtext: "text-[0.625rem]",
    gap: "gap-1.5",
    iconSize: "xs",
  },
  sm: {
    mark: "size-5",
    glyph: "size-3",
    text: "text-xs",
    subtext: "text-[0.65rem]",
    gap: "gap-2",
    iconSize: "sm",
  },
  md: {
    mark: "size-8",
    glyph: "size-4",
    text: "text-sm",
    subtext: "text-xs",
    gap: "gap-2.5",
    iconSize: "md",
  },
  lg: {
    mark: "size-11",
    glyph: "size-5",
    text: "text-base",
    subtext: "text-sm",
    gap: "gap-3",
    iconSize: "lg",
  },
};

/* --------------------------------------------------------------- accounts */

export type AccountTypeDisplay = { label: string; icon: DisplayIcon; color: string };

/** One icon and tint per account type. Every account of a type looks like this, everywhere. */
export const ACCOUNT_TYPE_DISPLAY: Record<AccountType, AccountTypeDisplay> = {
  cash: { label: ACCOUNT_TYPE_LABELS.cash, icon: WalletIcon, color: "#10b981" },
  investment: { label: ACCOUNT_TYPE_LABELS.investment, icon: PieChart02Icon, color: "#6366f1" },
  crypto: { label: ACCOUNT_TYPE_LABELS.crypto, icon: BitcoinCircleIcon, color: "#f59e0b" },
  loan: { label: ACCOUNT_TYPE_LABELS.loan, icon: DollarCircleIcon, color: "#ef4444" },
  credit_card: { label: ACCOUNT_TYPE_LABELS.credit_card, icon: CreditCardIcon, color: "#64748b" },
  property: { label: ACCOUNT_TYPE_LABELS.property, icon: Home01Icon, color: "#0ea5e9" },
  vehicle: { label: ACCOUNT_TYPE_LABELS.vehicle, icon: Car01Icon, color: "#8b5cf6" },
  other_asset: {
    label: ACCOUNT_TYPE_LABELS.other_asset,
    icon: DashboardSquare01Icon,
    color: "#14b8a6",
  },
  other_liability: {
    label: ACCOUNT_TYPE_LABELS.other_liability,
    icon: SlidersHorizontalIcon,
    color: "#f97316",
  },
};

/** Subtypes that deserve their own icon (a motorcycle is not a car). Others use the type's icon. */
export const ACCOUNT_SUBTYPE_ICONS: Partial<Record<AccountSubtype, DisplayIcon>> = {
  car: Car01Icon,
  motorcycle: Motorbike01Icon,
  truck: DeliveryTruck01Icon,
  van: DeliveryTruck01Icon,
  recreational_vehicle: Bus01Icon,
  aircraft: Airplane01Icon,
  savings: PiggyBankIcon,
  mortgage: Home01Icon,
  commercial: Building03Icon,
};

/* ------------------------------------------------------------ transactions */

export type TransactionTypeDisplayConfig = {
  label: string;
  icon: DisplayIcon;
  /** Tailwind text color for the icon. */
  tone: string;
};

export const TRANSACTION_TYPE_DISPLAY: Record<
  TransactionFeedOriginType,
  TransactionTypeDisplayConfig
> = {
  expense: { label: "Expense", icon: ArrowUp01Icon, tone: "text-red-500" },
  income: { label: "Income", icon: ArrowDown01Icon, tone: "text-emerald-500" },
  transfer: { label: "Transfer", icon: Exchange01Icon, tone: "text-sky-500" },
  adjustment: { label: "Adjustment", icon: SlidersHorizontalIcon, tone: "text-muted-foreground" },
  credit_card_installment: { label: "Installment", icon: CreditCardIcon, tone: "text-orange-500" },
  credit_card_payment: { label: "Card payment", icon: CreditCardIcon, tone: "text-sky-500" },
};

/* ----------------------------------------------------------------- amounts */

export type AmountKind = "income" | "expense" | "transfer" | "neutral";

export const AMOUNT_KIND_DISPLAY: Record<AmountKind, { sign: string; className: string }> = {
  income: { sign: "+", className: "text-emerald-600 dark:text-emerald-400" },
  expense: { sign: "-", className: "text-destructive" },
  transfer: { sign: "", className: "text-foreground" },
  neutral: { sign: "", className: "text-foreground" },
};

/** Which way money moved for a transaction type, so callers never re-decide signs and colors. */
export function amountKindForTransactionType(
  type: TransactionType | TransactionFeedOriginType,
): AmountKind {
  switch (type) {
    case "expense":
    case "credit_card_installment":
      return "expense";
    case "income":
      return "income";
    case "transfer":
    case "credit_card_payment":
      return "transfer";
    default:
      return "neutral";
  }
}

/** Sign-based kind for a signed number: positive is income-like, negative expense-like. */
export function amountKindForSignedAmount(amount: number): AmountKind {
  return amount > 0 ? "income" : amount < 0 ? "expense" : "neutral";
}

/* ---------------------------------------------------------------- merchants */

export const MERCHANT_FALLBACK = { icon: Store01Icon, color: "#64748b" } as const;

/* ------------------------------------------------------------ empty labels */

export const EMPTY_LABELS = {
  account: "No account",
  category: "Uncategorized",
  merchant: "No merchant",
} as const;
