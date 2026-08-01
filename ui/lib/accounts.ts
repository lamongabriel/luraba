import {
  ArrowLeftRightIcon,
  CreditCardIcon,
  DashboardSquare01Icon,
  DollarCircleIcon,
  Home01Icon,
  PieChart02Icon,
  WalletIcon,
} from "@hugeicons/core-free-icons"
import type { HugeiconsIcon } from "@hugeicons/react"
import type { ComponentProps } from "react"

import { ACCOUNT_TYPES, type AccountType } from "@/interfaces/account"

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  depository: "Depository",
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
  depository: WalletIcon,
  loan: DollarCircleIcon,
  credit_card: CreditCardIcon,
  property: Home01Icon,
  vehicle: DashboardSquare01Icon,
  other_asset: PieChart02Icon,
  other_liability: ArrowLeftRightIcon,
}

export const CREATABLE_ACCOUNT_TYPES = ACCOUNT_TYPES.filter(
  (type): type is Exclude<AccountType, "credit_card"> => type !== "credit_card",
)

export const CREATABLE_ACCOUNT_TYPE_OPTIONS = CREATABLE_ACCOUNT_TYPES.map(
  (type) => ({
    value: type,
    label: ACCOUNT_TYPE_LABELS[type],
  }),
)

export function formatAccountTypeLabel(type: AccountType) {
  return ACCOUNT_TYPE_LABELS[type]
}

export function getAccountTypeIcon(type: AccountType) {
  return ACCOUNT_TYPE_ICONS[type]
}
