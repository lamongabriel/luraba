import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Credit card",
  description: "Credit card limit, invoices and transactions.",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
