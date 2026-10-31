import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Investment transactions",
  description: "Buys, sells and other investment activity.",
  path: "/investments/transactions",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
