import type { ReactNode } from "react";

import { SplitsAccess } from "./_access";

export default function SplitsLayout({ children }: { children: ReactNode }) {
  return <SplitsAccess>{children}</SplitsAccess>;
}
