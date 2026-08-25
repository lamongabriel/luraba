import {
  ArrowLeftRightIcon,
  BitcoinCircleIcon,
  CreditCardIcon,
  DashboardSquare01Icon,
  DollarCircleIcon,
  Home01Icon,
  PieChart02Icon,
  WalletIcon,
} from "@hugeicons/core-free-icons"
import type { HugeiconsIcon } from "@hugeicons/react"
import type { ComponentProps } from "react"

import {
  ACCOUNT_TYPES,
  type AccountSubtype,
  type AccountType,
  type CreatableNonCardAccountType,
} from "@/interfaces/account"

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: "Cash",
  investment: "Investment",
  crypto: "Crypto",
  loan: "Loan",
  credit_card: "Credit card",
  property: "Property",
  vehicle: "Vehicle",
  other_asset: "Other asset",
  other_liability: "Other liability",
}

export const ACCOUNT_TYPE_ICONS: Record<
  AccountType,
  ComponentProps<typeof HugeiconsIcon>["icon"]
> = {
  cash: WalletIcon,
  investment: PieChart02Icon,
  crypto: BitcoinCircleIcon,
  loan: DollarCircleIcon,
  credit_card: CreditCardIcon,
  property: Home01Icon,
  vehicle: DashboardSquare01Icon,
  other_asset: PieChart02Icon,
  other_liability: ArrowLeftRightIcon,
}

export const CREATABLE_ACCOUNT_TYPES = ACCOUNT_TYPES.filter(
  (type): type is CreatableNonCardAccountType => type !== "credit_card",
)

export const ACCOUNT_TYPE_OPTIONS = CREATABLE_ACCOUNT_TYPES.map((type) => ({
  value: type,
  label: ACCOUNT_TYPE_LABELS[type],
}))
export const CREATABLE_ACCOUNT_TYPE_OPTIONS = ACCOUNT_TYPE_OPTIONS

export const ACCOUNT_SUBTYPE_OPTIONS: Record<
  Exclude<AccountType, "credit_card">,
  Array<{ value: AccountSubtype; label: string }>
> = {
  cash: [
    { value: "checking", label: "Checking" },
    { value: "savings", label: "Savings" },
    { value: "cash", label: "Cash" },
    { value: "money_market", label: "Money market" },
    { value: "certificate_of_deposit", label: "Certificate of deposit" },
    { value: "prepaid", label: "Prepaid" },
    { value: "other", label: "Other" },
  ],
  investment: [
    { value: "brokerage", label: "Brokerage" },
    { value: "retirement", label: "Retirement" },
    { value: "pension", label: "Pension" },
    { value: "education", label: "Education" },
    { value: "employee_stock", label: "Employee stock" },
    { value: "other", label: "Other" },
  ],
  crypto: [
    { value: "exchange", label: "Exchange" },
    { value: "wallet", label: "Wallet" },
    { value: "custody", label: "Custody" },
    { value: "staking", label: "Staking" },
    { value: "other", label: "Other" },
  ],
  property: [
    { value: "house", label: "House" },
    { value: "apartment", label: "Apartment" },
    { value: "condominium", label: "Condominium" },
    { value: "land", label: "Land" },
    { value: "commercial", label: "Commercial" },
    { value: "storage", label: "Storage unit" },
    { value: "parking", label: "Parking" },
    { value: "other", label: "Other" },
  ],
  vehicle: [
    { value: "car", label: "Car" },
    { value: "motorcycle", label: "Motorcycle" },
    { value: "truck", label: "Truck" },
    { value: "van", label: "Van" },
    { value: "recreational_vehicle", label: "Recreational vehicle" },
    { value: "boat", label: "Boat" },
    { value: "aircraft", label: "Aircraft" },
    { value: "other", label: "Other" },
  ],
  loan: [
    { value: "mortgage", label: "Mortgage" },
    { value: "auto", label: "Auto loan" },
    { value: "student", label: "Student loan" },
    { value: "personal", label: "Personal loan" },
    { value: "business", label: "Business loan" },
    { value: "line_of_credit", label: "Line of credit" },
    { value: "other", label: "Other" },
  ],
  other_asset: [
    { value: "collectible", label: "Collectible" },
    { value: "precious_metal", label: "Precious metal" },
    { value: "business_ownership", label: "Business ownership" },
    { value: "receivable", label: "Receivable" },
    { value: "other", label: "Other" },
  ],
  other_liability: [
    { value: "tax", label: "Tax" },
    { value: "medical", label: "Medical" },
    { value: "payable", label: "Payable" },
    { value: "legal", label: "Legal" },
    { value: "other", label: "Other" },
  ],
}

export const AREA_UNIT_OPTIONS = [
  { value: "sqm", label: "Square meters" },
  { value: "sqft", label: "Square feet" },
] as const

export const MILEAGE_UNIT_OPTIONS = [
  { value: "km", label: "Kilometers" },
  { value: "mi", label: "Miles" },
] as const

export const INTEREST_RATE_TYPE_OPTIONS = [
  { value: "fixed", label: "Fixed" },
  { value: "variable", label: "Variable" },
] as const

export const PAYMENT_FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every two weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
  { value: "other", label: "Other" },
] as const

export function formatAccountTypeLabel(type: AccountType) {
  return ACCOUNT_TYPE_LABELS[type]
}

export function formatAccountSubtypeLabel(subtype: string) {
  return subtype
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function getAccountTypeIcon(type: AccountType) {
  return ACCOUNT_TYPE_ICONS[type]
}
