"use client";

import { BankIcon } from "@hugeicons/core-free-icons";

import { CreditCardBrandMark } from "@/components/credit-cards/credit-card-brand";
import { cn } from "@/lib/utils";

import { DISPLAY_SIZES, type DisplaySize } from "./constants";
import { DisplayMark } from "./display-mark";

/** The fields of a credit card (or an overview card) the display needs. */
export interface CreditCardDisplayInput {
  name: string;
  institutionName: string | null;
  institutionLogoUrl?: string | null;
  brand: string;
  last4: string;
  color?: string | null;
}

/**
 * A credit card led by its **institution**: the bank's logo (else a bank icon) and name, then the
 * card's name, brand and last four digits. Use it where several cards sit together and the person
 * must tell which bank each one belongs to (overview tiles, pickers, headers).
 */
export function CreditCardDisplay({
  card,
  size = "md",
  className,
}: {
  card: CreditCardDisplayInput;
  size?: DisplaySize;
  className?: string;
}) {
  const dims = DISPLAY_SIZES[size];

  return (
    <span className={cn("flex min-w-0 items-center", dims.gap, className)}>
      <DisplayMark
        imageUrl={card.institutionLogoUrl}
        icon={BankIcon}
        color={card.color}
        size={size}
      />
      <span className="min-w-0">
        <span className={cn("block truncate font-medium", dims.text)}>
          {card.institutionName?.trim() || "No institution"}
        </span>
        <span className={cn("flex min-w-0 items-center gap-1 text-muted-foreground", dims.subtext)}>
          <CreditCardBrandMark brand={card.brand} className="h-3.5 w-5" />
          <span className="truncate">
            {card.name} ••{card.last4}
          </span>
        </span>
      </span>
    </span>
  );
}
