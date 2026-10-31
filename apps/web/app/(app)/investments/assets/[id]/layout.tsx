import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Asset",
  description: "Position, price history and activity for an asset.",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
