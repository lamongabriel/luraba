import type { ReactNode } from "react";

import { BillsAccess } from "./_access";

export default function BillsLayout({ children }: { children: ReactNode }) {
  return <BillsAccess>{children}</BillsAccess>;
}
