"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { RefundReason } from "@luraba/contracts";

import { cn } from "@/lib/utils";

import {
  DISPLAY_SIZES,
  type DisplaySize,
  REFUND_REASON_LABELS,
  TRANSACTION_TYPE_DISPLAY,
} from "./constants";

/** Why money came back (refund, cancellation, chargeback, cashback, split): the money-back glyph + the reason. */
export function RefundReasonDisplay({
  reason,
  size = "sm",
  className,
}: {
  reason: RefundReason;
  size?: DisplaySize;
  className?: string;
}) {
  const config = TRANSACTION_TYPE_DISPLAY.refund;
  const dims = DISPLAY_SIZES[size];
  return (
    <span className={cn("inline-flex items-center", dims.gap, dims.text, className)}>
      <HugeiconsIcon
        icon={config.icon}
        strokeWidth={2}
        className={cn(dims.glyph, config.tone)}
        aria-hidden
      />
      <span className="truncate">{REFUND_REASON_LABELS[reason]}</span>
    </span>
  );
}
