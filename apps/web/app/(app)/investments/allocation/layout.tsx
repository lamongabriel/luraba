import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Allocation",
  description: "How your portfolio is allocated.",
  path: "/investments/allocation",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
