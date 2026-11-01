"use client";

import type { CreditCard } from "@luraba/contracts";
import { AccountDisplay, CreditCardDisplay } from "@/components/display";
import { PageSection } from "@/components/finance/page-section";
import { Skeleton } from "@/components/ui/skeleton";

const ROW_CLASS = "flex h-10 items-center justify-between gap-3 text-sm";

/** Which bank the card belongs to, when its invoice closes and is due, and the account that pays it. */
export function CreditCardDetailsPanel({ card }: { card: CreditCard }) {
  return (
    <PageSection title="Card details">
      <CreditCardDisplay card={card} size="lg" />
      <dl className="divide-y divide-border/60">
        <div className={ROW_CLASS}>
          <dt className="text-muted-foreground">Invoice closes</dt>
          <dd className="font-medium">Day {card.closingDay}</dd>
        </div>
        <div className={ROW_CLASS}>
          <dt className="text-muted-foreground">Invoice due</dt>
          <dd className="font-medium">Day {card.dueDay}</dd>
        </div>
        <div className={ROW_CLASS}>
          <dt className="text-muted-foreground">Paid from</dt>
          <dd className="min-w-0">
            <AccountDisplay account={card.ownerAccount} size="sm" />
          </dd>
        </div>
      </dl>
    </PageSection>
  );
}

/** Loading twin of `CreditCardDetailsPanel`. */
export function CreditCardDetailsPanelSkeleton() {
  return (
    <PageSection title="Card details">
      <div role="status" aria-busy="true" aria-label="Loading card details" className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-px">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </PageSection>
  );
}
