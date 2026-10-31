import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Bill",
  description: "Bill schedule and payment history.",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
