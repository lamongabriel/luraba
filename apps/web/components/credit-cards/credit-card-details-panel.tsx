"use client";

import type { CreditCard } from "@luraba/contracts";
import { AccountDisplay, AmountDisplay, CreditCardDisplay } from "@/components/display";
import { PageSection } from "@/components/finance/page-section";
import { Skeleton } from "@/components/ui/skeleton";

const ROW_CLASS = "flex h-10 items-center justify-between gap-3 text-sm";

/**
 * Which bank the card belongs to, when its invoice closes and is due, the account that pays it and
 * the card's credit balance (payments no invoice asks for; never counted as paid on an invoice).
 * `creditBalance` is in minor units and `undefined` while the overview is still loading.
 */
export function CreditCardDetailsPanel({
  card,
  creditBalance,
  language = "en",
  precision = 2,
}: {
  card: CreditCard;
  creditBalance?: number;
  language?: string;
  precision?: number;
}) {
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
        <div className={ROW_CLASS}>
          <dt className="text-muted-foreground">Credit balance</dt>
          <dd className="font-medium">
            {creditBalance === undefined ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              <AmountDisplay
                amount={creditBalance}
                currencyCode={card.currencyCode}
                language={language}
                precision={precision}
                kind={creditBalance > 0 ? "income" : "neutral"}
                showSign={false}
              />
            )}
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
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </PageSection>
  );
}
