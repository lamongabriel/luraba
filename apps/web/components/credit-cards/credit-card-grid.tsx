"use client";

import { Invoice01Icon, MoreHorizontalIcon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CreditCardOverviewCard } from "@luraba/contracts";
import Link from "next/link";
import { CreditCardPreview } from "@/components/credit-cards/credit-card-preview";
import { AmountDisplay, CreditCardDisplay } from "@/components/display";
import { PageSection } from "@/components/finance/page-section";
import { PERMISSIONS, useCan } from "@/components/permissions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

/** Small tiles (13.5 to 15rem) that wrap as many per row as fit; the info block has a fixed height shared with the skeleton. */
export const CARD_GRID_CLASS =
  "grid grid-cols-[repeat(auto-fill,minmax(13.5rem,15rem))] gap-x-5 gap-y-7";
const TILE_INFO_CLASS = "mt-2.5 flex h-[5rem] flex-col gap-2 px-0.5";

/**
 * The household's cards as a grid of tiles: the card visual (opens its page), the bank and card
 * name, and how much of the limit is used (bar, used of limit). Invoices are listed beside, not here.
 */
export function CreditCardGrid({
  cards,
  language,
  precisionOf,
  onEdit,
}: {
  cards: CreditCardOverviewCard[];
  language: string;
  precisionOf: (currencyCode: string) => number;
  onEdit: (creditCardId: string) => void;
}) {
  const can = useCan();

  return (
    <PageSection
      title="Your cards"
      description={`${cards.length} ${cards.length === 1 ? "card" : "cards"}`}
    >
      <ul className={CARD_GRID_CLASS} aria-label="Credit cards">
        {cards.map((card) => {
          const limit = card.limit.limit;
          const usedPercent =
            limit && limit > 0 ? Math.min(100, Math.round((card.limit.used / limit) * 100)) : null;
          const money = (amount: number) => (
            <AmountDisplay
              amount={amount}
              currencyCode={card.currencyCode}
              language={language}
              precision={precisionOf(card.currencyCode)}
              showSign={false}
            />
          );

          return (
            <li key={card.creditCardId} className="min-w-0">
              <Link
                href={`/credit-cards/${card.creditCardId}`}
                aria-label={`Open ${card.name}`}
                className="block rounded-2xl transition-transform hover:-translate-y-0.5"
              >
                <CreditCardPreview
                  size="sm"
                  brand={card.brand}
                  color={card.color ?? undefined}
                  institutionName={card.institutionName ?? undefined}
                  last4={card.last4}
                  name={card.name}
                />
              </Link>
              <div className={TILE_INFO_CLASS}>
                <div className="flex items-center justify-between gap-2">
                  <CreditCardDisplay card={card} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${card.name}`}
                        className="shrink-0"
                      >
                        <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/credit-cards/${card.creditCardId}`}>
                          <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} />
                          View invoices
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!can(PERMISSIONS.CREDIT_CARDS_UPDATE)}
                        onSelect={() => onEdit(card.creditCardId)}
                      >
                        <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                        Edit card
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-auto space-y-1.5">
                  {usedPercent !== null && limit !== null ? (
                    <>
                      <div
                        className="h-1.5 overflow-hidden rounded-full bg-muted"
                        role="img"
                        aria-label={`${usedPercent}% of the limit used`}
                      >
                        <div
                          className={cn(
                            "h-full rounded-full",
                            usedPercent >= 90 ? "bg-destructive" : "bg-primary",
                          )}
                          style={{ width: `${usedPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {money(card.limit.used)} of {money(limit)}
                        </span>
                        <span>{usedPercent}%</span>
                      </div>
                    </>
                  ) : (
                    <Typography variant="small-muted">No credit limit set</Typography>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </PageSection>
  );
}

/** Loading twin of `CreditCardGrid`: the same grid, visual ratio and info block. */
export function CreditCardGridSkeleton() {
  return (
    <PageSection title="Your cards" description={<Skeleton className="inline-block h-3 w-12" />}>
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading credit cards"
        className={CARD_GRID_CLASS}
      >
        {[0, 1, 2].map((key) => (
          <div key={key} className="min-w-0">
            <Skeleton className="aspect-[1.586/1] w-full rounded-2xl" />
            <div className={TILE_INFO_CLASS}>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="mt-auto h-8 w-full" />
            </div>
          </div>
        ))}
      </div>
    </PageSection>
  );
}
