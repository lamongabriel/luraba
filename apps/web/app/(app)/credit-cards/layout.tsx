import type { ReactNode } from "react"

import { CreditCardsAccess } from "./_access"

export default function CreditCardsLayout({
  children,
}: {
  children: ReactNode
}) {
  return <CreditCardsAccess>{children}</CreditCardsAccess>
}
