"use client";

import {
  FileExportIcon,
  FileImportIcon,
  Layers01Icon,
  Shield01Icon,
  Store01Icon,
  TagsIcon,
  UserCircleIcon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons";
import { PERMISSIONS } from "@luraba/contracts";
import type { ReactNode } from "react";
import { SectionLayout, type SectionNavItem } from "@/components/section/section-layout";
import { useHouseholdQuery } from "@/queries/households/use-households-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

const links: readonly SectionNavItem[] = [
  { href: "/household", label: "Profile", icon: UserCircleIcon, exact: true },
  {
    href: "/household/members",
    label: "Members",
    icon: UserMultiple02Icon,
    permission: PERMISSIONS.HOUSEHOLD_MEMBERS_READ,
  },
  { href: "/household/roles", label: "Roles", icon: Shield01Icon },
  {
    href: "/household/categories",
    label: "Categories",
    icon: Layers01Icon,
    permission: PERMISSIONS.CATEGORIES_READ,
  },
  {
    href: "/household/merchants",
    label: "Merchants",
    icon: Store01Icon,
    permission: PERMISSIONS.MERCHANTS_READ,
  },
  { href: "/household/tags", label: "Tags", icon: TagsIcon, permission: PERMISSIONS.TAGS_READ },
  {
    href: "/household/import",
    label: "Import",
    icon: FileImportIcon,
    permission: PERMISSIONS.IMPORTS_READ,
  },
  {
    href: "/household/export",
    label: "Export",
    icon: FileExportIcon,
    permission: PERMISSIONS.EXPORTS_READ,
  },
];

/** The active household's area: its name on top, a left menu, the page beside it. */
export function HouseholdLayout({ children }: { children: ReactNode }) {
  const householdId = useAuthSessionStore((state) => state.activeHouseholdId);
  const household = useHouseholdQuery(householdId).data;
  return (
    <SectionLayout
      title={household?.name ?? "Household"}
      subtitle="Members, categories, merchants, tags and your data."
      navLabel="Household"
      nav={links}
    >
      {children}
    </SectionLayout>
  );
}
