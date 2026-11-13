"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CreditCardOverviewCard } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import Link from "next/link";
import { AmountDisplay } from "@/components/display";
import { CardBrandMark } from "@/components/display/card-brand";
import { cn } from "@/lib/utils";

/** Fixed size of a tile and its skeleton: the carousel never shifts when data arrives. */
export const CARD_TILE_HEIGHT_CLASS = "h-52";
/** Desktop width; below `md` a tile is the whole screen width (one card per screen). */
export const CARD_TILE_WIDTH_CLASS = "w-full md:w-[21rem]";

const LABEL_CLASS = "text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground";

/**
 * One card of the carousel: name and brand on top, the statement due large, the available limit and
 * the due date below. Amounts stay in the card's own currency. A subtle gradient on the surface tokens
 * (tinted by the card's own color) works in light and dark; the whole tile opens the card.
 */
export function CreditCardTile({
  card,
  language,
  precision,
}: {
  card: CreditCardOverviewCard;
  language: string;
  precision: number;
}) {
  const invoice = card.invoice;
  const due = invoice?.remainingAmount ?? 0;
  const paidInFull = Boolean(
    invoice && invoice.statementAmount > 0 && invoice.remainingAmount === 0,
  );
  const money = (amount: number, className?: string) => (
    <AmountDisplay
      amount={amount}
      currencyCode={card.currencyCode}
      language={language}
      precision={precision}
      showSign={false}
      className={className}
    />
  );

  return (
    <Link
      href={`/credit-cards/${card.creditCardId}`}
      aria-label={`Open ${card.name}`}
      draggable={false}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/70 p-5 text-card-foreground shadow-sm ring-1 ring-foreground/5 transition-colors hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        CARD_TILE_HEIGHT_CLASS,
        CARD_TILE_WIDTH_CLASS,
      )}
    >
      {card.color ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-30 dark:opacity-25"
          style={{ backgroundColor: card.color }}
        />
      ) : null}
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{card.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {card.institutionName?.trim() ? `${card.institutionName} · ` : ""}••{card.last4}
          </p>
        </div>
        <CardBrandMark brand={card.brand} className="h-8 w-14 text-foreground/80" />
      </div>
      <div className="relative">
        <p className={LABEL_CLASS}>Statement due</p>
        {money(due, "block text-3xl/9 font-semibold tracking-tight")}
        <p className="mt-0.5 flex h-4 items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
          {paidInFull ? (
            <>
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-3.5" />
              Paid in full
            </>
          ) : null}
        </p>
      </div>
      <div className="relative flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={LABEL_CLASS}>Available limit</p>
          <p className="truncate text-sm font-medium">
            {card.limit.available === null ? "No limit set" : money(card.limit.available)}
          </p>
        </div>
        <div className="text-right">
          <p className={LABEL_CLASS}>Due date</p>
          <p className="text-sm font-medium">
            {invoice ? formatShortDate(invoice.dueDate, language) : "—"}
          </p>
        </div>
      </div>
    </Link>
  );
}
