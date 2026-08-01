import type * as React from "react"
import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  actions,
  className,
}: {
  title: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <Typography as="h1" variant="page-title" className="max-w-3xl">
        {title}
      </Typography>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </section>
  )
}
