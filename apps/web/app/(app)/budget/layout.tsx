import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/metadata";
import { BudgetAccess } from "./_access";

export const metadata = pageMetadata({
  title: "Budget",
  description: "Your monthly spending plan.",
  path: "/budget",
});

export default function BudgetLayout({ children }: { children: ReactNode }) {
  return <BudgetAccess>{children}</BudgetAccess>;
}
