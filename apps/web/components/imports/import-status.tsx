"use client";

import type { ImportIssue, ImportRowStatus } from "@luraba/contracts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<ImportRowStatus, string> = {
  ready: "Ready",
  invalid: "Needs attention",
  duplicate: "Already in Luraba",
  skipped: "Skipped",
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

/** Every problem and note on a row, worst first, so nothing is hidden behind a tooltip. */
export function IssueList({ issues }: { issues: ImportIssue[] }) {
  if (issues.length === 0) return null;
  const order = { error: 0, warning: 1, info: 2 } as const;
  return (
    <ul className="mt-1 space-y-0.5">
      {[...issues]
        .sort((a, b) => order[a.severity] - order[b.severity])
        .map((issue) => (
          <li
            key={`${issue.code}-${issue.message}`}
            className={cn("text-[0.6875rem]", SEVERITY_CLASS[issue.severity])}
          >
            {issue.message}
          </li>
        ))}
    </ul>
  );
}

export const SOURCE_KIND_LABELS = {
  bank_account: "Bank account statement",
  credit_card: "Credit card statement",
} as const;
