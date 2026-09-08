"use client";

import type * as React from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function FieldInfoHint({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          aria-label="More information"
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          className={cn(
            "inline-flex size-3.5 items-center justify-center rounded-full bg-muted/80 text-[0.55rem] font-semibold leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
            className,
          )}
        >
          <svg aria-hidden="true" viewBox="0 0 12 12" className="size-2.5" fill="none">
            <circle cx="6" cy="3" r="1" fill="currentColor" />
            <rect x="5.4" y="5" width="1.2" height="4" rx="0.6" fill="currentColor" />
          </svg>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-56">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
