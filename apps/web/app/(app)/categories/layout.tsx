import type { ReactNode } from "react"

import { CategoriesAccess } from "./_access"

export default function CategoriesLayout({
  children,
}: {
  children: ReactNode
}) {
  return <CategoriesAccess>{children}</CategoriesAccess>
}
