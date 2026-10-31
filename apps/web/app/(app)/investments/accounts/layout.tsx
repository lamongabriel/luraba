import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Investment accounts",
  description: "Brokerage and investment accounts.",
  path: "/investments/accounts",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
