import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Goal",
  description: "Goal progress and contributions.",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
