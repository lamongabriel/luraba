import type { ReactNode } from "react"

import { ReportsAccess } from "./_access"

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return <ReportsAccess>{children}</ReportsAccess>
}
