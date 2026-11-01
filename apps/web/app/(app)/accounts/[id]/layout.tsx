import type { Metadata } from "next";
import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";

/**
 * "Account | Luraba" until the page knows the name; `usePageTitle` then makes it
 * "Chase Checking | Luraba". The name cannot be read here: it needs the user's session and the
 * active household, which only exist in the browser (see components/brand/README.md).
 */
export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Account",
    description: "Account balance, history and details.",
  });
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
