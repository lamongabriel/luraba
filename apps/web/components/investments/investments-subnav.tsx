"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/investments", label: "Overview", exact: true },
  { href: "/investments/holdings", label: "Holdings" },
  { href: "/investments/transactions", label: "Transactions" },
  { href: "/investments/income", label: "Income" },
  { href: "/investments/allocation", label: "Allocation" },
  { href: "/investments/taxes", label: "Taxes" },
  { href: "/investments/accounts", label: "Accounts" },
  { href: "/investments/import", label: "Import & export" },
  { href: "/investments/settings", label: "Settings" },
] as const;

/** Section tabs for the Investments area. */
export function InvestmentsSubnav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Investments sections"
      className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
    >
      <ul className="flex min-w-max items-center gap-1">
        {LINKS.map((link) => {
          const active =
            "exact" in link && link.exact
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
