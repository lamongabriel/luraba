"use client";

import type { ImportIssue, ImportRowStatus } from "@luraba/contracts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<ImportRowStatus, string> = {
  ready: "Ready",
  invalid: "Needs a fix",
  duplicate: "Already in Luraba",
  skipped: "Removed",
  created: "Imported",
  failed: "Failed",
};

const STATUS_VARIANTS: Record<
  ImportRowStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ready: "secondary",
  invalid: "destructive",
  duplicate: "outline",
  skipped: "outline",
  created: "default",
  failed: "destructive",
};

export function RowStatusBadge({ status }: { status: ImportRowStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}

const SEVERITY_CLASS: Record<ImportIssue["severity"], string> = {
  error: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-muted-foreground",
};

/** The worst problem on a row, one short line, with a count of the rest. */
export function IssueList({ issues }: { issues: ImportIssue[] }) {
  if (issues.length === 0) return null;
  const order = { error: 0, warning: 1, info: 2 } as const;
  const [first, ...rest] = [...issues].sort((a, b) => order[a.severity] - order[b.severity]);
  if (!first) return null;
  return (
    <p className={cn("mt-1 text-[0.6875rem]", SEVERITY_CLASS[first.severity])}>
      {first.message}
      {rest.length > 0 ? ` +${rest.length} more` : ""}
    </p>
  );
}

export const SOURCE_KIND_LABELS = {
  bank_account: "Bank account statement",
  credit_card: "Credit card statement",
} as const;
