import type { ReactNode } from "react";

import { DashboardAccess } from "./_access";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardAccess>{children}</DashboardAccess>;
}
