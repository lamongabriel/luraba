import type * as React from "react"

import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

export function InfoItem({
  label,
  value,
  description,
  className,
}: {
  label: string
  value: React.ReactNode
  description?: string
  className?: string
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <Typography variant="small-muted">{label}</Typography>
      <Typography variant="small-strong" className="truncate">
        {value}
      </Typography>
      {description ? (
        <Typography variant="small-muted" className="line-clamp-2">
          {description}
        </Typography>
      ) : null}
    </div>
  )
}
