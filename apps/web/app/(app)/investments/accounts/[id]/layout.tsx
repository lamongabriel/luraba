import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Investment account",
  description: "Holdings and activity for an investment account.",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
