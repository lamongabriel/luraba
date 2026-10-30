"use client";

import { ChartLineData01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export function InvestmentsEmpty() {
  return (
    <EmptyState
      icon={<HugeiconsIcon icon={ChartLineData01Icon} strokeWidth={2} />}
      title="Start tracking your investments"
      description="Create an investment account, then record your first buy, deposit or import a broker statement."
      action={
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/investments/accounts">Create an account</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/investments/import">Import a statement</Link>
          </Button>
        </div>
      }
    />
  );
}
