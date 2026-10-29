"use client";

import Color from "color";

import { CreditCardBrand } from "@/components/credit-cards/credit-card-brand";
import { cn } from "@/lib/utils";

const fallbackColor = "#d4d4d8";

function safeColor(value: string | undefined) {
  try {
    return Color(value || fallbackColor);
  } catch {
    return Color(fallbackColor);
  }
}

/** A flat, rounded card in the card's color with its brand, name and last four digits. */
export function CreditCardPreview({
  brand,
  color,
  institutionName,
  last4,
  name,
  className,
}: {
  brand?: string;
  color?: string;
  institutionName?: string;
  last4?: string;
  name?: string;
  className?: string;
}) {
  const cardColor = safeColor(color);
  const foreground = cardColor.isLight() ? "#111827" : "#ffffff";
  const displayedLast4 = /^\d{4}$/.test(last4 ?? "") ? last4 : "••••";

  return (
    <div
      className={cn(
        "flex aspect-[1.586/1] w-full flex-col justify-between rounded-2xl p-5 shadow-sm",
        className,
      )}
      style={{ backgroundColor: cardColor.hex(), color: foreground }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="truncate text-xs font-medium tracking-wide opacity-80">
          {institutionName?.trim() || " "}
        </span>
        {brand ? <CreditCardBrand brand={brand} className="shrink-0" /> : null}
      </div>
      <div>
        <div className="text-base font-medium tracking-[0.14em]">•••• {displayedLast4}</div>
        <div className="mt-1 truncate text-sm opacity-80">{name?.trim() || " "}</div>
      </div>
    </div>
  );
}
