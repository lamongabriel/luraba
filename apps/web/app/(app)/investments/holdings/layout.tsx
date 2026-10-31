import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Holdings",
  description: "Everything you currently hold.",
  path: "/investments/holdings",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
