import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Budgets",
  description: "Track monthly budgeted and actual income and expenses.",
});

export default function BugdetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
