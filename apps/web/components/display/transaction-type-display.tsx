"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { TransactionFeedOriginType } from "@luraba/contracts";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { DISPLAY_SIZES, type DisplaySize, TRANSACTION_TYPE_DISPLAY } from "./constants";

export function getTransactionTypeLabel(type: TransactionFeedOriginType): string {
  return TRANSACTION_TYPE_DISPLAY[type].label;
}

/**
 * How a transaction type (expense, income, transfer, card payment...) is shown.
 * `badge` is an outlined pill, `inline` is icon + text, `icon` is the glyph alone.
 */
export function TransactionTypeDisplay({
  type,
  variant = "badge",
  size = "sm",
  className,
}: {
  type: TransactionFeedOriginType;
  variant?: "badge" | "inline" | "icon";
  size?: DisplaySize;
  className?: string;
}) {
  const config = TRANSACTION_TYPE_DISPLAY[type];
  const dims = DISPLAY_SIZES[size];
  const glyph = (
    <HugeiconsIcon
      icon={config.icon}
      strokeWidth={2}
      className={cn(dims.glyph, config.tone)}
      aria-hidden={variant !== "icon"}
      aria-label={variant === "icon" ? config.label : undefined}
    />
  );

  if (variant === "icon") return glyph;
  if (variant === "inline") {
    return (
      <span className={cn("inline-flex items-center", dims.gap, dims.text, className)}>
        {glyph}
        <span className="truncate">{config.label}</span>
      </span>
    );
  }

  return (
    <Badge variant="outline" className={cn("max-w-36 gap-1.5 px-2", className)}>
      {glyph}
      <span className="truncate">{config.label}</span>
    </Badge>
  );
}
