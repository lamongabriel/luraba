"use client";

import { PieChartIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

/** No expense categories exist, so there is nothing to put a budget on yet. */
export function BudgetsEmpty() {
  return (
    <EmptyState
      icon={<HugeiconsIcon icon={PieChartIcon} strokeWidth={1.8} className="size-5" />}
      title="Nothing to budget yet"
      description="Create an expense category first, then give it a monthly limit."
      action={
        <Button asChild>
          <Link href="/household/categories">Create categories</Link>
        </Button>
      }
    />
  );
}
