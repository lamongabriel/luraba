import type { ReactNode } from "react";

import { ExportAccess } from "./_access";

export default function ExportLayout({ children }: { children: ReactNode }) {
  return <ExportAccess>{children}</ExportAccess>;
}
