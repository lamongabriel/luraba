"use client";

import { CreditCardIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PaymentIcon, type PaymentType } from "react-svg-credit-card-payment-icons";

import { getCreditCardBrand } from "@/lib/credit-cards";
import { cn } from "@/lib/utils";

/**
 * The real network logos (Visa, Mastercard, Maestro, American Express, Elo, Discover, JCB, UnionPay) from the icon set's `logo` format,
 * cropped to the logo's own bounds so the mark is not a small drawing floating in a padded 780x500 box. The crop
 * is the `viewBox`; the set draws the logo on a transparent background (no card, no chip).
 */
const LOGO_VIEWBOX: Partial<Record<PaymentType, string>> = {
  Visa: "60 143 660 214",
  Mastercard: "109 76 561 347",
  Maestro: "110 77 561 346",
  AmericanExpress: "0 113 780 274",
  Elo: "72 133 637 233",
  Discover: "62 197 657 105",
  JCB: "148 63 484 373",
  UnionPay: "105 70 571 360",
};

/** Brands shown as a bold wordmark: their logo is not a clean standalone mark. */
const WORDMARKS: Record<string, string> = {
  Hipercard: "Hipercard",
};

/**
 * A card network (Visa, Mastercard, American Express...) as its real logo on a transparent background, in a
 * `h-5 w-8` box by default (size it with `className`; the logo is contained and centered, never stretched).
 * `tone="onDark"` is for marks over a dark card: single-color parts (Visa's wordmark, Elo's lettering) turn to
 * the current text color so they stay readable, while colored parts (Mastercard's circles) keep their colors.
 */
export function CardBrandMark({
  brand,
  tone = "color",
  className,
}: {
  brand: string;
  tone?: "color" | "onDark";
  className?: string;
}) {
  const { paymentType, label } = getCreditCardBrand(brand);
  const box = cn(
    "inline-flex h-5 w-8 shrink-0 items-center justify-center text-current",
    className,
  );
  const viewBox = LOGO_VIEWBOX[paymentType];

  if (viewBox) {
    const recolor =
      tone === "onDark"
        ? paymentType === "Visa"
          ? "[&_path]:fill-current"
          : paymentType === "Elo"
            ? "[&_path:not([fill])]:fill-current"
            : undefined
        : undefined;
    return (
      <span className={box} role="img" aria-label={label}>
        <PaymentIcon
          type={paymentType}
          format="logo"
          viewBox={viewBox}
          aria-hidden="true"
          className={cn("size-full", recolor)}
        />
      </span>
    );
  }
  const wordmark = WORDMARKS[paymentType];
  if (wordmark) {
    return (
      <span
        className={cn(box, "w-auto text-[0.7rem] font-bold tracking-tight")}
        role="img"
        aria-label={label}
      >
        {wordmark}
      </span>
    );
  }
  return (
    <span className={box} role="img" aria-label="Card">
      <HugeiconsIcon icon={CreditCardIcon} strokeWidth={1.8} className="size-full p-0.5" />
    </span>
  );
}
