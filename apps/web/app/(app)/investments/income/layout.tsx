import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Investment income",
  description: "Dividends, interest and other income.",
  path: "/investments/income",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
