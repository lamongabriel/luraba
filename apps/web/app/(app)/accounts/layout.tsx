import type { ReactNode } from "react"

import { AccountsAccess } from "./_access"

export default function AccountsLayout({ children }: { children: ReactNode }) {
  return <AccountsAccess>{children}</AccountsAccess>
}
