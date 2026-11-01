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
  size = "md",
  className,
}: {
  brand?: string;
  color?: string;
  institutionName?: string;
  last4?: string;
  name?: string;
  /** `sm` is the compact tile for lists of cards (about 15rem wide); the text and chip shrink with it. */
  size?: "md" | "sm";
  className?: string;
}) {
  const small = size === "sm";
  const cardColor = safeColor(color);
  const foreground = cardColor.isLight() ? "#111827" : "#ffffff";
  const displayedLast4 = /^\d{4}$/.test(last4 ?? "") ? last4 : "••••";

  return (
    <div
      className={cn(
        "flex aspect-[1.586/1] w-full flex-col justify-between rounded-2xl shadow-sm",
        small ? "p-3.5" : "p-5",
        className,
      )}
      style={{ backgroundColor: cardColor.hex(), color: foreground }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "truncate font-medium tracking-wide opacity-80",
            small ? "text-[0.65rem]" : "text-xs",
          )}
        >
          {institutionName?.trim() || " "}
        </span>
        {brand ? (
          <CreditCardBrand
            brand={brand}
            chip
            className={cn("shrink-0", small && "origin-top-right scale-75")}
          />
        ) : null}
      </div>
      <div>
        <div className={cn("font-medium tracking-[0.14em]", small ? "text-sm" : "text-base")}>
          •••• {displayedLast4}
        </div>
        <div className={cn("mt-1 truncate opacity-80", small ? "text-xs" : "text-sm")}>
          {name?.trim() || " "}
        </div>
      </div>
    </div>
  );
}
