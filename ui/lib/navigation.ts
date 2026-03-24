import {
  ArrowLeftRight,
  CircleDollarSign,
  LayoutDashboard,
  PieChart,
  Tags,
  Wallet,
} from "lucide-react"

export const mainNav = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { title: "Accounts", href: "/accounts", icon: Wallet },
  { title: "Reports", href: "/reports", icon: PieChart },
  { title: "Budgets", href: "/budgets", icon: CircleDollarSign },
  { title: "Categories", href: "/categories", icon: Tags },
  { title: "Tags", href: "/tags", icon: Tags },
]
