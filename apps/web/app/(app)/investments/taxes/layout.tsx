import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Taxes",
  description: "Investment tax summary.",
  path: "/investments/taxes",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
