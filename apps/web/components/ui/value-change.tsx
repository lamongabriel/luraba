"use client";

import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { NumberTicker } from "@/components/ui/number-ticker";
import { cn } from "@/lib/utils";

type ChangeTone = "positive" | "negative" | "neutral";
type ChangeTrend = ChangeTone | "auto";
type ChangeIcon = React.ComponentProps<typeof HugeiconsIcon>["icon"] | null;

function formatChangeValue(value: number, locale: string, decimalPlaces: number) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}

export function ValueChange({
  value,
  label,
  suffix = "%",
  decimalPlaces = 2,
  locale = "en-US",
  animate = true,
  showIcon = true,
  showSign = true,
  trend = "auto",
  positiveIcon = ArrowUp01Icon,
  negativeIcon = ArrowDown01Icon,
  neutralIcon = null,
  className,
  valueClassName,
  iconClassName,
  positiveClassName = "text-emerald-400",
  negativeClassName = "text-rose-400",
  neutralClassName = "text-muted-foreground",
}: {
  value: number;
  label?: React.ReactNode;
  suffix?: React.ReactNode;
  decimalPlaces?: number;
  locale?: string;
  animate?: boolean;
  showIcon?: boolean;
  showSign?: boolean;
  trend?: ChangeTrend;
  positiveIcon?: ChangeIcon;
  negativeIcon?: ChangeIcon;
  neutralIcon?: ChangeIcon;
  className?: string;
  valueClassName?: string;
  iconClassName?: string;
  positiveClassName?: string;
  negativeClassName?: string;
  neutralClassName?: string;
}) {
  const resolvedTrend: ChangeTone =
    trend === "auto" ? (value > 0 ? "positive" : value < 0 ? "negative" : "neutral") : trend;

  const toneClassName =
    resolvedTrend === "positive"
      ? positiveClassName
      : resolvedTrend === "negative"
        ? negativeClassName
        : neutralClassName;

  const icon =
    resolvedTrend === "positive"
      ? positiveIcon
      : resolvedTrend === "negative"
        ? negativeIcon
        : neutralIcon;

  const absoluteValue = Math.abs(value);
  const shouldShowPrefixSign = showSign && value !== 0;
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const formattedValue = formatChangeValue(showSign ? absoluteValue : value, locale, decimalPlaces);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-sm font-medium tabular-nums",
        toneClassName,
        className,
      )}
    >
      {showIcon && icon ? (
        <HugeiconsIcon icon={icon} strokeWidth={2.2} className={cn("size-4", iconClassName)} />
      ) : null}

      {shouldShowPrefixSign ? <span>{sign}</span> : null}

      {animate ? (
        <NumberTicker
          value={showSign ? absoluteValue : value}
          decimalPlaces={decimalPlaces}
          className={cn("tracking-normal tabular-nums", toneClassName, valueClassName)}
        />
      ) : (
        <span className={cn("tracking-normal tabular-nums", toneClassName, valueClassName)}>
          {formattedValue}
        </span>
      )}

      {suffix ? <span>{suffix}</span> : null}
      {label ? <span>{label}</span> : null}
    </div>
  );
}
