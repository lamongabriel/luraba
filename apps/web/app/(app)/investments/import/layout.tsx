import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Import investments",
  description: "Import investment transactions from statements.",
  path: "/investments/import",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
