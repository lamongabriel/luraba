"use client";

import type * as React from "react";

import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export function SidePanelSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <Typography as="h2" variant="eyebrow">
        {title}
      </Typography>
      <div className="divide-y divide-border/60">{children}</div>
    </section>
  );
}

export function SidePanelDetailRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-5 py-2.5 text-sm", className)}>
      <Typography variant="small-muted">{label}</Typography>
      <div className="min-w-0 max-w-[68%] text-right text-xs/relaxed font-medium">{children}</div>
    </div>
  );
}

export function SidePanelSettingCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-[var(--color-container-inset)] px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <Typography variant="small-strong">{title}</Typography>
        {description ? (
          <Typography variant="small-muted" className="mt-1">
            {description}
          </Typography>
        ) : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}
