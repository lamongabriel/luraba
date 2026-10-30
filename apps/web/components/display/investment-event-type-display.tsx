"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { InvestmentEventType } from "@luraba/contracts";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { DISPLAY_SIZES, type DisplaySize, INVESTMENT_EVENT_TYPE_DISPLAY } from "./constants";

export function getInvestmentEventTypeLabel(type: InvestmentEventType) {
  return INVESTMENT_EVENT_TYPE_DISPLAY[type].label;
}

/** How an investment transaction type (buy, sell, dividend, split...) is shown everywhere. */
export function InvestmentEventTypeDisplay({
  type,
  variant = "badge",
  size = "sm",
  className,
}: {
  type: InvestmentEventType;
  variant?: "badge" | "inline" | "icon";
  size?: DisplaySize;
  className?: string;
}) {
  const config = INVESTMENT_EVENT_TYPE_DISPLAY[type];
  const dims = DISPLAY_SIZES[size];
  const icon = (
    <HugeiconsIcon
      icon={config.icon}
      strokeWidth={2}
      className={cn(dims.glyph, config.tone)}
      aria-hidden
    />
  );

  if (variant === "icon") {
    return (
      <span title={config.label} className={cn("inline-flex", className)}>
        {icon}
        <span className="sr-only">{config.label}</span>
      </span>
    );
  }
  if (variant === "inline") {
    return (
      <span className={cn("inline-flex items-center", dims.gap, dims.text, className)}>
        {icon}
        {config.label}
      </span>
    );
  }
  return (
    <Badge variant="outline" className={cn("gap-1.5 px-2", className)}>
      {icon}
      {config.label}
    </Badge>
  );
}
