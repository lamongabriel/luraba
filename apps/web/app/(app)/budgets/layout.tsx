import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/metadata";
import { BudgetsAccess } from "./_access";

export const metadata = pageMetadata({
  title: "Budgets",
  description: "Plan your monthly spending by category and see how it is going.",
  path: "/budgets",
});

export default function BudgetsLayout({ children }: { children: ReactNode }) {
  return <BudgetsAccess>{children}</BudgetsAccess>;
}
