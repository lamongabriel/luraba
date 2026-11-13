"use client";

import { Archive02Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CreditCardOverviewCard } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import Link from "next/link";
import {
  CARD_FACE_WIDTH_CLASS,
  CreditCardPreview,
} from "@/components/credit-cards/credit-card-preview";
import { AmountDisplay } from "@/components/display";
import { cn } from "@/lib/utils";

/** The width of a tile and its skeleton (the face keeps the card ratio, so the height follows). */
export const CARD_TILE_WIDTH_CLASS = CARD_FACE_WIDTH_CLASS;

const LABEL_CLASS = "text-[0.65rem] font-medium uppercase tracking-wider opacity-70";

/**
 * One card of the carousel: the real card face (`CreditCardPreview size="lg"`: the card's color, institution,
 * network logo, name and last four digits) with the statement due, the available limit and the due date over it.
 * Amounts stay in the card's own currency and inherit the face's text color. The whole face opens the card.
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
      className={cn("text-inherit", className)}
    />
  );

  return (
    <Link
      href={`/credit-cards/${card.creditCardId}`}
      aria-label={`Open ${card.name}${card.archived ? " (archived)" : ""}`}
      draggable={false}
      className={cn(
        "block rounded-2xl transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        CARD_TILE_WIDTH_CLASS,
        card.archived && "opacity-60",
      )}
    >
      <CreditCardPreview
        size="lg"
        brand={card.brand}
        color={card.color}
        institutionName={card.institutionName}
        name={card.name}
        last4={card.last4}
      >
        <p className={LABEL_CLASS}>Statement due</p>
        {money(due, "block text-3xl/9 font-semibold tracking-tight")}
        <p className="mt-0.5 flex h-4 items-center gap-1 text-xs font-medium opacity-90">
          {card.archived ? (
            <>
              <HugeiconsIcon icon={Archive02Icon} strokeWidth={2} className="size-3.5" />
              Archived
            </>
          ) : paidInFull ? (
            <>
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-3.5" />
              Paid in full
            </>
          ) : null}
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
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
      </CreditCardPreview>
    </Link>
  );
}
