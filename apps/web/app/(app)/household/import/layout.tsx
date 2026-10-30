import type { ReactNode } from "react";

import { ImportAccess } from "./_access";

export default function ImportLayout({ children }: { children: ReactNode }) {
  return <ImportAccess>{children}</ImportAccess>;
}
