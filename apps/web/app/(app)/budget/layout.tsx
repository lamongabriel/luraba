import type { ReactNode } from "react";

import { BudgetAccess } from "./_access";

export default function BudgetLayout({ children }: { children: ReactNode }) {
  return <BudgetAccess>{children}</BudgetAccess>;
}
