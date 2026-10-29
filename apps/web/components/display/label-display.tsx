"use client";

import type { Category, Tag } from "@luraba/contracts";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

import { DISPLAY_SIZES, type DisplaySize, EMPTY_LABELS } from "./constants";

type Labelled = Pick<Category, "name" | "icon" | "color"> | Pick<Tag, "name" | "icon" | "color">;

function LabelDisplay({
  entity,
  size,
  variant,
  className,
}: {
  entity: Labelled;
  size: DisplaySize;
  variant: "chip" | "inline";
  className?: string;
}) {
  const dims = DISPLAY_SIZES[size];
  const content = (
    <>
      <Icon name={entity.icon} color={entity.color} variant="chip" size={dims.iconSize} />
      <span className="truncate">{entity.name}</span>
    </>
  );

  if (variant === "inline") {
    return (
      <span className={cn("inline-flex min-w-0 items-center", dims.gap, dims.text, className)}>
        {content}
      </span>
    );
  }
  return (
    <Badge variant="outline" className={cn("max-w-40 gap-1.5 px-2", className)}>
      {content}
    </Badge>
  );
}

/** How a category is shown everywhere; `null` renders the "Uncategorized" state. */
export function CategoryDisplay({
  category,
  size = "sm",
  variant = "chip",
  className,
  emptyLabel = EMPTY_LABELS.category,
}: {
  category: Pick<Category, "name" | "icon" | "color"> | null | undefined;
  size?: DisplaySize;
  variant?: "chip" | "inline";
  className?: string;
  emptyLabel?: string;
}) {
  if (!category) {
    return (
      <Badge variant="outline" className={className}>
        <span
          className="size-1.5 shrink-0 rounded-full bg-muted-foreground/60"
          aria-hidden="true"
        />
        {emptyLabel}
      </Badge>
    );
  }
  return <LabelDisplay entity={category} size={size} variant={variant} className={className} />;
}

/** How a tag is shown everywhere. */
export function TagDisplay({
  tag,
  size = "sm",
  variant = "chip",
  className,
}: {
  tag: Pick<Tag, "name" | "icon" | "color">;
  size?: DisplaySize;
  variant?: "chip" | "inline";
  className?: string;
}) {
  return <LabelDisplay entity={tag} size={size} variant={variant} className={className} />;
}
