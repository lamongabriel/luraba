"use client";

import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A read-only code or URL block with a copy button. */
export function CopyBlock({
  value,
  label,
  className,
}: {
  value: string;
  /** Accessible name of the copy button, e.g. "Copy MCP URL". */
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 p-3",
        className,
      )}
    >
      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm">
        {value}
      </pre>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={label}
        onClick={() => void copy()}
      >
        <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} strokeWidth={2} />
      </Button>
    </div>
  );
}
