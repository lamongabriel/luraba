import * as React from "react";

import { cn } from "@/lib/utils";

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
        "rounded-[1.25rem] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]",
        accent === "brand" &&
          "border-primary/20 bg-linear-to-br from-primary/10 via-primary/5 to-white dark:to-background",
        accent === "positive" && "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20",
        accent === "negative" && "border-rose-200/80 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/20",
        accent === "neutral" && "border-border/70 bg-[var(--color-container-inset)]",
        className,
      )}
    >
      <p className="text-[0.72rem] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      {hint ? <div className="mt-2 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
