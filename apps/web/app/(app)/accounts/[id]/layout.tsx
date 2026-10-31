import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Account",
  description: "Account balance, history and details.",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
