import type { ReactNode } from "react";

import { GoalsAccess } from "./_access";

export default function GoalsLayout({ children }: { children: ReactNode }) {
  return <GoalsAccess>{children}</GoalsAccess>;
}
