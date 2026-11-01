"use client";

import { PieChartIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { EmptyState } from "@/components/empty-state";

/** A month with no categories to plan: the budget needs categories first. */
export function BudgetEmpty() {
  return (
    <EmptyState
      icon={<HugeiconsIcon icon={PieChartIcon} strokeWidth={1.8} className="size-5" />}
      title="Nothing to plan yet"
      description="Create categories first, then plan each month by category."
    />
  );
}
