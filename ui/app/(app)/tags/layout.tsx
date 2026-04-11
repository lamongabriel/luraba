import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Tags",
  description: "Manage tags for organizing transactions and records.",
});

export default function TagsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
