"use client";

import { CreditCardIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PaymentIcon } from "react-svg-credit-card-payment-icons";

import { getCreditCardBrand } from "@/lib/credit-cards";
import { cn } from "@/lib/utils";

/** Brands drawn from the icon set's logo, flattened to the text color (no background, no brand colors). */
const LOGO_BRANDS = new Set(["Visa", "Discover", "Hipercard"]);
/** Brands shown as a bold wordmark: their logos are multi-color and unreadable when flattened. */
const WORDMARKS: Record<string, string> = {
  AmericanExpress: "AMEX",
  Elo: "elo",
  JCB: "JCB",
  UnionPay: "UnionPay",
};

/**
 * A card network (Visa, Mastercard, American Express...) as a small transparent mark painted in the current text
 * color, so it works on dark and light cards, lists and selects alike. Never a box: no white or colored background.
 * Size it with `className` (it fills a `h-5 w-8` box by default).
 */
export function CardBrandMark({ brand, className }: { brand: string; className?: string }) {
  const { paymentType } = getCreditCardBrand(brand);
  const box = cn(
    "inline-flex h-5 w-8 shrink-0 items-center justify-center text-current",
    className,
  );

  if (paymentType === "Mastercard" || paymentType === "Maestro") {
    return (
      <span className={box} role="img" aria-label={getCreditCardBrand(brand).label}>
        <svg viewBox="0 0 32 20" className="size-full" aria-hidden="true">
          <circle cx="12" cy="10" r="9" fill="currentColor" opacity={0.85} />
          <circle cx="20" cy="10" r="9" fill="currentColor" opacity={0.5} />
        </svg>
      </span>
    );
  }
  if (LOGO_BRANDS.has(paymentType)) {
    return (
      <span className={box} role="img" aria-label={getCreditCardBrand(brand).label}>
        <PaymentIcon
          type={paymentType}
          format="logo"
          aria-hidden="true"
          className="size-full [&_*]:fill-current"
        />
      </span>
    );
  }
  const wordmark = WORDMARKS[paymentType];
  if (wordmark) {
    return <span className={cn(box, "text-[0.7rem] font-bold tracking-tight")}>{wordmark}</span>;
  }
  return (
    <span className={box} role="img" aria-label="Card">
      <HugeiconsIcon icon={CreditCardIcon} strokeWidth={1.8} className="size-full p-0.5" />
    </span>
  );
}
