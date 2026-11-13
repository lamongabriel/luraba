"use client";

import Color from "color";
import type * as React from "react";

import { CardBrandMark } from "@/components/display/card-brand";
import { cn } from "@/lib/utils";

const fallbackColor = "#d4d4d8";

function safeColor(value: string | null | undefined) {
  try {
    return Color(value || fallbackColor);
  } catch {
    return Color(fallbackColor);
  }
}

/** Width of a face by size on desktop; below `md` a `lg` face is the width of its column. The height follows the ratio. */
export const CARD_FACE_WIDTH_CLASS = "w-full md:w-[24rem]";

/**
 * THE credit card visual: a rounded card in the card's own color (any color, text flips to dark or white by
 * luminance) with the institution, the network's real logo, the last four digits and the card name. Used on the
 * card detail page, in the card form and, at `size="lg"` with `children`, as the face of the overview carousel.
 *
 * `children` are placed over the face between the top row and the bottom (statement total, limit, due date); the
 * face keeps the credit-card ratio (1.586) at every size, so nothing is ever squeezed or stretched.
 */
export function CreditCardPreview({
  brand,
  color,
  institutionName,
  last4,
  name,
  size = "md",
  children,
  className,
}: {
  brand?: string;
  color?: string | null;
  institutionName?: string | null;
  last4?: string;
  name?: string;
  /** `sm` is the compact tile for lists of cards, `md` the detail/form card, `lg` the overview face with content. */
  size?: "md" | "sm" | "lg";
  children?: React.ReactNode;
  className?: string;
}) {
  const small = size === "sm";
  const large = size === "lg";
  const cardColor = safeColor(color);
  const isLight = cardColor.isLight();
  const foreground = isLight ? "#111827" : "#ffffff";
  const displayedLast4 = /^\d{4}$/.test(last4 ?? "") ? last4 : "••••";

  return (
    <div
      data-slot="credit-card-face"
      data-size={size}
      className={cn(
        "relative flex aspect-[1.586/1] w-full flex-col justify-between overflow-hidden rounded-2xl shadow-sm",
        small ? "p-3.5" : large ? "p-5" : "p-5",
        className,
      )}
      style={{ backgroundColor: cardColor.hex(), color: foreground }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/15"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={cn(
              "block truncate font-medium tracking-wide opacity-90",
              small ? "text-[0.65rem]" : large ? "text-sm" : "text-xs",
            )}
          >
            {institutionName?.trim() || " "}
          </span>
          {large ? (
            <span className="mt-0.5 block truncate text-xs opacity-70">
              {name?.trim() || " "} · ••{displayedLast4}
            </span>
          ) : null}
        </div>
        {brand ? (
          <CardBrandMark
            brand={brand}
            tone={isLight ? "color" : "onDark"}
            className={cn("shrink-0", large ? "h-8 w-14" : small ? "h-4 w-7" : "h-6 w-10")}
          />
        ) : null}
      </div>
      {large ? (
        <div className="relative">{children}</div>
      ) : (
        <div className="relative">
          <div className={cn("font-medium tracking-[0.14em]", small ? "text-sm" : "text-base")}>
            •••• {displayedLast4}
          </div>
          <div className={cn("mt-1 truncate opacity-80", small ? "text-xs" : "text-sm")}>
            {name?.trim() || " "}
          </div>
        </div>
      )}
    </div>
  );
}
