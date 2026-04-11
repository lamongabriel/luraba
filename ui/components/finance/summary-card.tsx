import * as React from "react";

import { cn } from "@/lib/utils";
import { Typography } from "@/components/ui/typography";

export function SummaryCard({
  label,
  value,
  hint,
  accent = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: "neutral" | "positive" | "negative" | "brand";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.35rem] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        accent === "brand" &&
          "border-primary/25 bg-linear-to-br from-primary/14 via-primary/8 to-[var(--color-container-inset)] shadow-[0_20px_48px_rgba(79,61,227,0.18)]",
        accent === "positive" && "border-emerald-500/20 bg-linear-to-br from-emerald-500/10 to-[var(--color-container-inset)]",
        accent === "negative" && "border-rose-500/20 bg-linear-to-br from-rose-500/10 to-[var(--color-container-inset)]",
        accent === "neutral" && "border-border/70 bg-[var(--color-container-inset)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-white/18 to-transparent" />
      <Typography variant="eyebrow" className="text-[0.72rem] tracking-[0.22em]">
        {label}
      </Typography>
      <Typography as="div" variant="metric" className="mt-3">
        {value}
      </Typography>
      {hint ? (
        <Typography as="div" variant="small-muted" className="mt-2">
          {hint}
        </Typography>
      ) : null}
    </div>
  );
}
