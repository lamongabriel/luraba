import * as React from "react";

import { cn } from "@/lib/utils";

export function SegmentedBar({
  segments,
  className,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);

  if (total <= 0) {
    return <div className={cn("h-2 rounded-full bg-border/70", className)} />;
  }

  return (
    <div className={cn("flex h-2 overflow-hidden rounded-full bg-border/70", className)}>
      {segments.map((segment) => (
        <div
          key={segment.label}
          style={{
            width: `${(Math.max(segment.value, 0) / total) * 100}%`,
            backgroundColor: segment.color,
          }}
          title={`${segment.label}: ${segment.value}`}
        />
      ))}
    </div>
  );
}
