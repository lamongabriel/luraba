import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Account",
  description: "Review balances, history, billing cycles, and activity for this account.",
});

export default function AccountDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
