import type { ReactNode } from "react";

import { BudgetsAccess } from "./_access";

export default function BudgetsLayout({ children }: { children: ReactNode }) {
  return <BudgetsAccess>{children}</BudgetsAccess>;
}
