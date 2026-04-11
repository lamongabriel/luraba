import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Accounts",
  description: "Manage asset, liability, and credit card accounts.",
});

export default function AccountsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
