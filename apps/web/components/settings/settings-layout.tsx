"use client";

import { Settings02Icon, Shield01Icon, UserCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/settings/profile", label: "Profile", icon: UserCircleIcon },
  { href: "/settings/preferences", label: "Preferences", icon: Settings02Icon },
  { href: "/settings/security", label: "Security", icon: Shield01Icon },
] as const;

export function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]">
      <nav aria-label="Settings" className="space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-muted",
              pathname === link.href && "bg-muted font-medium text-foreground",
            )}
          >
            <HugeiconsIcon icon={link.icon} className="size-4" />
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
