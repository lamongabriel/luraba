import {
  ArrowLeftRightIcon,
  DashboardSquare01Icon,
  DollarCircleIcon,
  PieChart02Icon,
  Settings02Icon,
  TagsIcon,
  WalletIcon,
} from "@hugeicons/core-free-icons"

export const mainNav = [
  { title: "Dashboard", href: "/dashboard", icon: DashboardSquare01Icon },
  { title: "Transactions", href: "/transactions", icon: ArrowLeftRightIcon },
  { title: "Accounts", href: "/accounts", icon: WalletIcon },
  { title: "Reports", href: "/reports", icon: PieChart02Icon },
  { title: "Budgets", href: "/budgets", icon: DollarCircleIcon },
  { title: "Categories", href: "/categories", icon: TagsIcon },
  { title: "Tags", href: "/tags", icon: TagsIcon },
]

export const userMenuLinks = [
  { label: "Settings", href: "/settings", icon: Settings02Icon },
] as const
