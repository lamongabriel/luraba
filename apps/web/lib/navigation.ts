import {
  ArrowLeftRightIcon,
  CreditCardIcon,
  DashboardSquare01Icon,
  DollarCircleIcon,
  Layers01Icon,
  PieChart02Icon,
  RepeatIcon,
  Settings02Icon,
  TagsIcon,
  UserGroupIcon,
  WalletIcon,
} from "@hugeicons/core-free-icons"
import { PERMISSIONS, type PermissionKey } from "@luraba/contracts"

export interface NavigationItem {
  title: string
  href: string
  icon: typeof DashboardSquare01Icon
  permission?: PermissionKey
}

export const mainNav: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: DashboardSquare01Icon,
    permission: PERMISSIONS.HOUSEHOLD_READ,
  },
  {
    title: "Transactions",
    href: "/transactions",
    icon: ArrowLeftRightIcon,
    permission: PERMISSIONS.TRANSACTIONS_READ,
  },
  {
    title: "Accounts",
    href: "/accounts",
    icon: WalletIcon,
    permission: PERMISSIONS.ACCOUNTS_READ,
  },
  {
    title: "Credit Cards",
    href: "/credit-cards",
    icon: CreditCardIcon,
    permission: PERMISSIONS.CREDIT_CARDS_READ,
  },
  {
    title: "Reports",
    href: "/reports",
    icon: PieChart02Icon,
    permission: PERMISSIONS.TRANSACTIONS_READ,
  },
  {
    title: "Budgets",
    href: "/budgets",
    icon: DollarCircleIcon,
    permission: PERMISSIONS.BUDGETS_READ,
  },
  {
    title: "Categories",
    href: "/categories",
    icon: Layers01Icon,
    permission: PERMISSIONS.CATEGORIES_READ,
  },
  {
    title: "Tags",
    href: "/tags",
    icon: TagsIcon,
    permission: PERMISSIONS.TAGS_READ,
  },
  {
    title: "Recurring bills",
    href: "/recurring-bills",
    icon: RepeatIcon,
    permission: PERMISSIONS.RECURRING_BILLS_READ,
  },
]

export const userMenuLinks = [
  { label: "Settings", href: "/settings", icon: Settings02Icon },
  { label: "Households", href: "/households", icon: UserGroupIcon },
] as const

export function getFirstAccessibleRoute(
  permissions: readonly string[],
): string {
  const granted = new Set(permissions)
  const item = mainNav.find(
    ({ permission }) => !permission || granted.has(permission),
  )

  return item?.href ?? "/dashboard"
}
