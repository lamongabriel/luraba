import type * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

/** A labelled headline number with an optional line under it (a change, a note). */
export function MetricCard({
  label,
  value,
  detail,
  className,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardContent className="space-y-1.5">
        <Typography variant="label">{label}</Typography>
        <div className="truncate text-xl font-semibold tracking-tight tabular-nums">{value}</div>
        {detail ? <div className="truncate text-xs text-muted-foreground">{detail}</div> : null}
      </CardContent>
    </Card>
  );
}
