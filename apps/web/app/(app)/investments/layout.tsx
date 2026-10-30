import type { ReactNode } from "react";

import { InvestmentsAccess } from "./_access";

export default function InvestmentsLayout({ children }: { children: ReactNode }) {
  return <InvestmentsAccess>{children}</InvestmentsAccess>;
}
