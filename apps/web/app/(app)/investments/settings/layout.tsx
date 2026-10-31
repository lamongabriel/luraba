import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Investment settings",
  description: "Preferences for the investments workspace.",
  path: "/investments/settings",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
