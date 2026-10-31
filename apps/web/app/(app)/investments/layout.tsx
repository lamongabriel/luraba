import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/metadata";
import { InvestmentsAccess } from "./_access";

export const metadata = pageMetadata({
  title: "Investments",
  description: "Portfolio overview and performance.",
  path: "/investments",
});

export default function InvestmentsLayout({ children }: { children: ReactNode }) {
  return <InvestmentsAccess>{children}</InvestmentsAccess>;
}
