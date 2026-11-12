"use client";

import { Wallet01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

/** No spendable account, bill, goal or card invoice exists yet, so there is nothing to subtract. */
export function PlanEmpty() {
  return (
    <EmptyState
      icon={<HugeiconsIcon icon={Wallet01Icon} strokeWidth={1.8} className="size-5" />}
      title="Nothing to plan yet"
      description="Add a checking account, a bill or a goal and Luraba will tell you how much you can still spend."
      action={
        <Button asChild>
          <Link href="/accounts">Add an account</Link>
        </Button>
      }
    />
  );
}
