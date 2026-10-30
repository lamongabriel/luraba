"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { PermissionInput } from "@luraba/contracts";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { useCan } from "@/components/permissions/use-can";
import { cn } from "@/lib/utils";

export type SectionNavItem = {
  href: string;
  label: string;
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  /** Match nested routes too (`/household/tags/…`). The root item should be exact. */
  exact?: boolean;
  /** Hidden from people who lack it (any of, when several). */
  permission?: PermissionInput;
};

function SectionNav({ items, label }: { items: readonly SectionNavItem[]; label: string }) {
  const pathname = usePathname();
  const can = useCan();
  return (
    <nav aria-label={label} className="space-y-1">
      {items
        .filter((item) => !item.permission || can(item.permission))
        .map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-muted",
                active && "bg-muted font-medium text-foreground",
              )}
            >
              <HugeiconsIcon icon={item.icon} className="size-4" />
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}

/**
 * The shell of a section area: the page title and subtitle on top, a left menu, the page beside
 * it. Settings and Household both use it, so they always look the same.
 */
export function SectionLayout({
  title,
  subtitle,
  leading,
  navLabel,
  nav,
  children,
}: {
  title: string;
  subtitle: React.ReactNode;
  /** A picture or icon shown before the title. */
  leading?: React.ReactNode;
  navLabel: string;
  nav: readonly SectionNavItem[];
  children: React.ReactNode;
}) {
  return (
    <InternalPageLayout title={title} subtitle={subtitle} leading={leading}>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <SectionNav items={nav} label={navLabel} />
        <div className="min-w-0 space-y-5">{children}</div>
      </div>
    </InternalPageLayout>
  );
}
