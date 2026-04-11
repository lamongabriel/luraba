import * as React from "react";

import { typographyVariants } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  open: "border-sky-500/20 bg-sky-500/10 text-sky-200",
  closed: "border-amber-500/20 bg-amber-500/10 text-amber-200",
  paid: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
  positive: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
  negative: "border-rose-500/20 bg-rose-500/10 text-rose-200",
  neutral: "border-border/70 bg-white/[0.03] text-foreground/85",
};

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof STATUS_STYLES;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 tracking-[0.16em] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm",
        typographyVariants({ variant: "label" }),
        STATUS_STYLES[tone],
      )}
    >
      {children}
    </span>
  );
}
