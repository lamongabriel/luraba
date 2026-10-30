import {
  Agreement02Icon,
  Airplane01Icon,
  ArrowDataTransferHorizontalIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  BankIcon,
  BitcoinCircleIcon,
  Building03Icon,
  Building06Icon,
  Bus01Icon,
  Calendar03Icon,
  Car01Icon,
  ChartIncreaseIcon,
  ChartLineData01Icon,
  Coins01Icon,
  CreditCardIcon,
  DashboardSquare01Icon,
  DeliveryTruck01Icon,
  DollarCircleIcon,
  Exchange01Icon,
  GiftIcon,
  Globe02Icon,
  Home01Icon,
  Invoice01Icon,
  Money01Icon,
  MoneyBag02Icon,
  Motorbike01Icon,
  Package01Icon,
  PercentIcon,
  PieChart02Icon,
  PiggyBankIcon,
  SlidersHorizontalIcon,
  SplitIcon,
  Store01Icon,
  TradeDownIcon,
  TradeUpIcon,
  WalletIcon,
} from "@hugeicons/core-free-icons";
import type { HugeiconsIcon } from "@hugeicons/react";
import type {
  AccountSubtype,
  AccountType,
  AssetClass,
  InvestmentEventType,
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

export const PRODUCT_FALLBACK = { icon: Package01Icon, color: "#a16207" } as const;
export const MERCHANT_FALLBACK = { icon: Store01Icon, color: "#64748b" } as const;

/* ------------------------------------------------------------ empty labels */

export const EMPTY_LABELS = {
  account: "No account",
  category: "Uncategorized",
  merchant: "No merchant",
  product: "No product",
  member: "Unknown",
  asset: "No asset",
} as const;

/* ------------------------------------------------------------- investments */

export type AssetClassDisplayConfig = {
  label: string;
  icon: DisplayIcon;
  color: string;
  /** Broad family used for grouping and filters. */
  group: "equity" | "fixed_income" | "fund" | "crypto" | "cash" | "other";
};

/** One label, icon and tint per asset class. Every asset of a class looks like this, everywhere. */
export const ASSET_CLASS_DISPLAY: Record<AssetClass, AssetClassDisplayConfig> = {
  STOCK: { label: "Stock", icon: ChartLineData01Icon, color: "#6366f1", group: "equity" },
  ETF: { label: "ETF", icon: ChartIncreaseIcon, color: "#0ea5e9", group: "fund" },
  BDR: { label: "BDR", icon: Globe02Icon, color: "#8b5cf6", group: "equity" },
  FII: { label: "REIT fund (FII)", icon: Building06Icon, color: "#10b981", group: "fund" },
  FIAGRO: { label: "Agro fund (FIAGRO)", icon: Building06Icon, color: "#84cc16", group: "fund" },
  REIT: { label: "REIT", icon: Building06Icon, color: "#14b8a6", group: "equity" },
  UNIT: { label: "Unit", icon: ChartLineData01Icon, color: "#6366f1", group: "equity" },
  MUTUAL_FUND: { label: "Mutual fund", icon: MoneyBag02Icon, color: "#f59e0b", group: "fund" },
  CRYPTO: { label: "Crypto", icon: BitcoinCircleIcon, color: "#f59e0b", group: "crypto" },
  TESOURO_DIRETO: {
    label: "Treasury (Tesouro)",
    icon: BankIcon,
    color: "#22c55e",
    group: "fixed_income",
  },
  CDB: { label: "CDB", icon: Agreement02Icon, color: "#3b82f6", group: "fixed_income" },
  LCI: { label: "LCI", icon: Agreement02Icon, color: "#06b6d4", group: "fixed_income" },
  LCA: { label: "LCA", icon: Agreement02Icon, color: "#65a30d", group: "fixed_income" },
  LC: { label: "LC", icon: Agreement02Icon, color: "#3b82f6", group: "fixed_income" },
  LCD: { label: "LCD", icon: Agreement02Icon, color: "#3b82f6", group: "fixed_income" },
  DEBENTURE: { label: "Debenture", icon: Invoice01Icon, color: "#a855f7", group: "fixed_income" },
  DEBENTURE_INCENTIVADA: {
    label: "Incentivized debenture",
    icon: Invoice01Icon,
    color: "#a855f7",
    group: "fixed_income",
  },
  CRI: { label: "CRI", icon: Invoice01Icon, color: "#ec4899", group: "fixed_income" },
  CRA: { label: "CRA", icon: Invoice01Icon, color: "#ec4899", group: "fixed_income" },
  POUPANCA: { label: "Savings (poupança)", icon: PiggyBankIcon, color: "#10b981", group: "cash" },
  US_TREASURY_BILL: { label: "US T-Bill", icon: BankIcon, color: "#2563eb", group: "fixed_income" },
  US_TREASURY_NOTE: { label: "US T-Note", icon: BankIcon, color: "#2563eb", group: "fixed_income" },
  US_TREASURY_BOND: { label: "US T-Bond", icon: BankIcon, color: "#2563eb", group: "fixed_income" },
  US_TIPS: { label: "US TIPS", icon: BankIcon, color: "#2563eb", group: "fixed_income" },
  US_I_BOND: { label: "US I Bond", icon: BankIcon, color: "#2563eb", group: "fixed_income" },
  CD: {
    label: "Certificate of deposit",
    icon: Agreement02Icon,
    color: "#0ea5e9",
    group: "fixed_income",
  },
  CORPORATE_BOND: {
    label: "Corporate bond",
    icon: Invoice01Icon,
    color: "#a855f7",
    group: "fixed_income",
  },
  CASH_EQUIVALENT: { label: "Cash equivalent", icon: Money01Icon, color: "#10b981", group: "cash" },
  OTHER: { label: "Other", icon: Package01Icon, color: "#64748b", group: "other" },
};

export type InvestmentEventTypeDisplayConfig = {
  label: string;
  icon: DisplayIcon;
  /** Tailwind text color for the icon. */
  tone: string;
  group: "cash" | "trade" | "income" | "corporate" | "fixed_income";
};

export const INVESTMENT_EVENT_TYPE_DISPLAY: Record<
  InvestmentEventType,
  InvestmentEventTypeDisplayConfig
> = {
  DEPOSIT: { label: "Deposit", icon: ArrowDown01Icon, tone: "text-emerald-500", group: "cash" },
  WITHDRAWAL: { label: "Withdrawal", icon: ArrowUp01Icon, tone: "text-red-500", group: "cash" },
  TRANSFER_IN: {
    label: "Transfer in",
    icon: ArrowDataTransferHorizontalIcon,
    tone: "text-sky-500",
    group: "cash",
  },
  TRANSFER_OUT: {
    label: "Transfer out",
    icon: ArrowDataTransferHorizontalIcon,
    tone: "text-sky-500",
    group: "cash",
  },
  FX_CONVERSION: {
    label: "Currency conversion",
    icon: Exchange01Icon,
    tone: "text-sky-500",
    group: "cash",
  },
  FEE: { label: "Fee", icon: Coins01Icon, tone: "text-red-500", group: "cash" },
  TAX_PAYMENT: { label: "Tax payment", icon: PercentIcon, tone: "text-red-500", group: "cash" },
  INTEREST_ON_CASH: {
    label: "Interest on cash",
    icon: Coins01Icon,
    tone: "text-emerald-500",
    group: "income",
  },
  BUY: { label: "Buy", icon: TradeUpIcon, tone: "text-emerald-500", group: "trade" },
  SELL: { label: "Sell", icon: TradeDownIcon, tone: "text-red-500", group: "trade" },
  SUBSCRIPTION: {
    label: "Subscription",
    icon: TradeUpIcon,
    tone: "text-emerald-500",
    group: "trade",
  },
  DIVIDEND: { label: "Dividend", icon: Coins01Icon, tone: "text-emerald-500", group: "income" },
  JCP: {
    label: "Interest on equity (JCP)",
    icon: Coins01Icon,
    tone: "text-emerald-500",
    group: "income",
  },
  FII_INCOME: {
    label: "REIT fund income",
    icon: Coins01Icon,
    tone: "text-emerald-500",
    group: "income",
  },
  COUPON: { label: "Coupon", icon: Calendar03Icon, tone: "text-emerald-500", group: "income" },
  BOND_INTEREST: {
    label: "Bond interest",
    icon: Coins01Icon,
    tone: "text-emerald-500",
    group: "income",
  },
  AMORTIZATION: { label: "Amortization", icon: Coins01Icon, tone: "text-sky-500", group: "income" },
  RETURN_OF_CAPITAL: {
    label: "Return of capital",
    icon: Coins01Icon,
    tone: "text-sky-500",
    group: "income",
  },
  SPLIT: { label: "Split", icon: SplitIcon, tone: "text-violet-500", group: "corporate" },
  REVERSE_SPLIT: {
    label: "Reverse split",
    icon: SplitIcon,
    tone: "text-violet-500",
    group: "corporate",
  },
  BONUS_SHARES: {
    label: "Bonus shares",
    icon: GiftIcon,
    tone: "text-violet-500",
    group: "corporate",
  },
  SUBSCRIPTION_RIGHT_RECEIVED: {
    label: "Subscription right",
    icon: GiftIcon,
    tone: "text-violet-500",
    group: "corporate",
  },
  SPIN_OFF: { label: "Spin-off", icon: SplitIcon, tone: "text-violet-500", group: "corporate" },
  MERGER: { label: "Merger", icon: Exchange01Icon, tone: "text-violet-500", group: "corporate" },
  TICKER_CHANGE: {
    label: "Ticker change",
    icon: Exchange01Icon,
    tone: "text-violet-500",
    group: "corporate",
  },
  DELISTING: {
    label: "Delisting",
    icon: ArrowDown01Icon,
    tone: "text-red-500",
    group: "corporate",
  },
  FI_APPLICATION: {
    label: "Application",
    icon: TradeUpIcon,
    tone: "text-emerald-500",
    group: "fixed_income",
  },
  FI_REDEMPTION: {
    label: "Redemption",
    icon: TradeDownIcon,
    tone: "text-red-500",
    group: "fixed_income",
  },
  FI_MATURITY: {
    label: "Maturity",
    icon: Calendar03Icon,
    tone: "text-sky-500",
    group: "fixed_income",
  },
};
