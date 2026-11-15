import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Piggy bank",
  description: "Balance, interest and movements of a piggy bank.",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
