"use client";

import {
  Notification01Icon,
  Settings02Icon,
  Shield01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";
import { SectionLayout, type SectionNavItem } from "@/components/section/section-layout";

const links: readonly SectionNavItem[] = [
  { href: "/settings/profile", label: "Profile", icon: UserCircleIcon },
  { href: "/settings/preferences", label: "Preferences", icon: Settings02Icon },
  { href: "/settings/notifications", label: "Notifications", icon: Notification01Icon },
  { href: "/settings/security", label: "Security", icon: Shield01Icon },
];

export function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <SectionLayout
      title="Settings"
      subtitle="Your profile, preferences, security and notifications."
      navLabel="Settings"
      nav={links}
    >
      {children}
    </SectionLayout>
  );
}
