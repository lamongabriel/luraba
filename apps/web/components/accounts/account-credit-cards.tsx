"use client";

import { CreditCardIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { AccountDetails } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import Link from "next/link";

import { AccountDisplay, AmountDisplay } from "@/components/display";
import { ErrorState } from "@/components/error-state";
import { PanelCard } from "@/components/finance/panel-card";
import { PanelCardSkeleton } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { INVOICE_STATUS } from "@/lib/credit-card-invoices";
import { cn } from "@/lib/utils";
import {
  useCreditCardOverviewQuery,
  useCreditCardsQuery,
} from "@/queries/credit-cards/use-credit-cards-query";

/**
 * The credit cards paid from this account: each one's open invoice and how much of its limit is in
 * use, linking to the card page. Renders nothing when the account has no cards.
 */
export function AccountCreditCards({
  account,
  language,
  precision,
}: {
  account: AccountDetails;
  language: string;
  precision: number;
}) {
  const cardsQuery = useCreditCardsQuery({ ownerAccountIds: [account.id], perPage: 20 });
  const overviewQuery = useCreditCardOverviewQuery();
  const cards = cardsQuery.data?.data ?? [];

  if (cardsQuery.isPending || overviewQuery.isPending) {
    return <PanelCardSkeleton label="Loading credit cards" lines={2} />;
  }
  if (cardsQuery.isError || overviewQuery.isError) {
    return (
      <ErrorState
        title="Couldn't load credit cards"
        description={cardsQuery.error?.message ?? overviewQuery.error?.message}
        onRetry={() => {
          void cardsQuery.refetch();
          void overviewQuery.refetch();
        }}
      />
    );
  }
  if (cards.length === 0) return null;

  return (
    <PanelCard
      title="Credit cards"
      description="Cards paid from this account"
      icon={<HugeiconsIcon icon={CreditCardIcon} strokeWidth={2} />}
    >
      <ul className="divide-y divide-border/60">
        {cards.map((card) => {
          const overview = overviewQuery.data?.cards.find((item) => item.creditCardId === card.id);
          const invoice = overview?.invoice ?? null;
          const limit = overview?.limit.limit ?? null;
          const used = overview?.limit.used ?? 0;
          const share = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
          const status = invoice ? INVOICE_STATUS[invoice.displayStatus] : null;

          return (
            <li key={card.id} className="first:pt-0 last:pb-0 py-3">
              <Link
                href={`/credit-cards/${card.id}`}
                className="block space-y-3 rounded-md transition-opacity hover:opacity-80"
              >
                <div className="flex items-center justify-between gap-3">
                  <AccountDisplay account={card} size="md" detail="type" />
                  {status ? (
                    <Badge variant="outline" className={cn("shrink-0", status.badge)}>
                      {status.label}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-end justify-between gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Invoice</span>
                    <div className="font-medium">
                      <AmountDisplay
                        amount={invoice?.statementAmount ?? 0}
                        currencyCode={card.currencyCode}
                        language={language}
                        precision={precision}
                        kind="neutral"
                      />
                    </div>
                    {invoice ? (
                      <span className="text-muted-foreground">
                        Due {formatShortDate(invoice.dueDate, language)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No invoice this month</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">
                      {limit === null ? "Limit use" : `Limit use · ${share}%`}
                    </span>
                    <div className="font-medium">
                      <AmountDisplay
                        amount={used}
                        currencyCode={card.currencyCode}
                        language={language}
                        precision={precision}
                        kind="neutral"
                      />
                      {limit !== null ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          of{" "}
                          <AmountDisplay
                            amount={limit}
                            currencyCode={card.currencyCode}
                            language={language}
                            precision={precision}
                            kind="neutral"
                          />
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                {limit !== null ? (
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={share}
                    aria-label={`${card.name} limit use`}
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className={cn(
                        "h-full rounded-full",
                        share >= 90 ? "bg-destructive" : "bg-primary",
                      )}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </PanelCard>
  );
}
