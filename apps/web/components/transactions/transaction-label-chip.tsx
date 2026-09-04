"use client"

import type { Category, Tag } from "@luraba/contracts"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

type LabelEntity =
  | Pick<Category, "name" | "icon" | "color">
  | Pick<Tag, "name" | "icon" | "color">

export function TransactionLabelChip({
  entity,
  variant = "default",
  className,
}: {
  entity: LabelEntity
  variant?: "default" | "compact"
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-40 gap-1.5 px-2",
        variant === "compact" && "h-5 rounded-md px-1.5 text-[0.65rem]",
        className,
      )}
    >
      <Icon
        name={entity.icon}
        color={entity.color}
        variant="chip"
        size="sm"
        className={variant === "compact" ? "size-3.5" : undefined}
      />
      <span className="truncate">{entity.name}</span>
    </Badge>
  )
}

export function UncategorizedChip({
  variant = "default",
}: {
  variant?: "default" | "compact"
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        variant === "compact" && "h-5 rounded-md px-1.5 text-[0.65rem]",
      )}
    >
      <span
        className="size-1.5 shrink-0 rounded-full bg-muted-foreground/60"
        aria-hidden="true"
      />
      Uncategorized
    </Badge>
  )
}
