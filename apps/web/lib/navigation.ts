import {
  ArrowLeftRightIcon,
  Calendar03Icon,
  ChartLineData01Icon,
  Coins01Icon,
  CreditCardIcon,
  DashboardSquare01Icon,
  Settings02Icon,
  UserGroupIcon,
  UserMultiple02Icon,
  Wallet01Icon as WalletIcon,
} from "@hugeicons/core-free-icons";
import { PERMISSIONS, type PermissionKey } from "@luraba/contracts";

export interface NavigationItem {
  title: string;
  href: string;
  icon: typeof DashboardSquare01Icon;
  permission?: PermissionKey;
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
    title: "Budgets & goals",
    href: "/plan",
    icon: Coins01Icon,
    permission: PERMISSIONS.GOALS_READ,
  },
  {
    title: "Investments",
    href: "/investments",
    icon: ChartLineData01Icon,
    permission: PERMISSIONS.INVESTMENTS_READ,
  },
  {
    title: "Bills",
    href: "/bills",
    icon: Calendar03Icon,
    permission: PERMISSIONS.BILLS_READ,
  },
  {
    title: "Splits",
    href: "/splits",
    icon: UserMultiple02Icon,
    permission: PERMISSIONS.SPLITS_READ,
  },
];

export const userMenuLinks = [
  { label: "Settings", href: "/settings", icon: Settings02Icon },
  { label: "Household", href: "/household", icon: UserGroupIcon },
] as const;

export function getFirstAccessibleRoute(permissions: readonly string[]): string {
  const granted = new Set(permissions);
  const item = mainNav.find(({ permission }) => !permission || granted.has(permission));

  return item?.href ?? "/dashboard";
}

/**
 * Whether a nav item is the current section: the page itself or any page nested under it, so
 * `/accounts/123` keeps "Accounts" highlighted (and `/credit-cards/1/invoices/2` "Credit Cards").
 */
export function isNavItemActive(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  return [href, ...(NAV_ALIASES[href] ?? [])].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

/** Routes that live under another item: a goal's detail page keeps "Budgets & goals" highlighted. */
const NAV_ALIASES: Record<string, string[]> = { "/plan": ["/goals"] };
