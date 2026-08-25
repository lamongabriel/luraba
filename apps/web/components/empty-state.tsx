import * as React from "react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

interface EmptyStateProps
  extends Omit<React.ComponentProps<typeof Empty>, "title"> {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  ...props
}: EmptyStateProps) {
  const titleId = React.useId()
  const descriptionId = React.useId()

  return (
    <Empty
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        "min-h-72 rounded-[1.75rem] border border-dashed border-border/75 bg-(--color-container) px-6 py-12",
        className,
      )}
      {...props}
    >
      <EmptyHeader className="max-w-md gap-2">
        {icon ? (
          <EmptyMedia
            variant="icon"
            className="mb-2 size-12 rounded-xl border border-border/75 bg-(--color-container-inset) text-muted-foreground [&_svg:not([class*='size-'])]:size-5"
          >
            {icon}
          </EmptyMedia>
        ) : null}
        <EmptyTitle
          id={titleId}
          role="heading"
          aria-level={2}
          className="text-base font-medium tracking-tight text-foreground"
        >
          {title}
        </EmptyTitle>
        {description ? (
          <EmptyDescription
            id={descriptionId}
            className="max-w-sm text-sm/6 text-muted-foreground"
          >
            {description}
          </EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action ? (
        <EmptyContent className="mt-2 max-w-none">{action}</EmptyContent>
      ) : null}
    </Empty>
  )
}
