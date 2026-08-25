import type * as React from "react"

import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

export function TransactionFormSection({
  children,
  className,
  description,
  title,
}: {
  children: React.ReactNode
  className?: string
  description?: string
  title: string
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <Typography as="h3" variant="eyebrow">
          {title}
        </Typography>
        {description ? (
          <Typography variant="small-muted">{description}</Typography>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
