import type { ReactNode } from "react";

import { TransactionsAccess } from "./_access";

export default function TransactionsLayout({ children }: { children: ReactNode }) {
  return <TransactionsAccess>{children}</TransactionsAccess>;
}
