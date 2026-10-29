"use client";

import Color from "color";
import type { ComponentProps } from "react";

import {
  CreditCard,
  CreditCardBack,
  CreditCardChip,
  CreditCardFlipper,
  CreditCardFront,
  CreditCardMagStripe,
  CreditCardName,
  CreditCardNumber,
  CreditCardServiceProvider,
} from "@/components/ui/credit-card";
import { getCreditCardBrand } from "@/lib/credit-cards";
import { cn } from "@/lib/utils";

const fallbackColor = "#d4d4d8";

function safeColor(value: string | undefined) {
  try {
    return Color(value || fallbackColor);
  } catch {
    return Color(fallbackColor);
  }
}

export function CreditCardPreview({
  brand,
  color,
  institutionName,
  last4,
  name,
  onClick,
  selected = false,
  className,
}: {
  brand?: string;
  color?: string;
  institutionName?: string;
  last4?: string;
  name?: string;
  onClick?: ComponentProps<typeof CreditCardFlipper>["onClick"];
  selected?: boolean;
  className?: string;
}) {
  const cardColor = safeColor(color);
  const foreground = cardColor.isLight() ? "#111827" : "#ffffff";
  const provider = getCreditCardBrand(brand);
  const displayedLast4 = /^\d{4}$/.test(last4 ?? "") ? last4 : "••••";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-muted/15 p-4 transition-colors",
        selected && "border-primary/70 bg-primary/5",
        className,
      )}
    >
      <CreditCard className="mx-auto max-w-sm">
        <CreditCardFlipper aria-label={`Select ${name?.trim() || "credit card"}`} onClick={onClick}>
          <CreditCardFront style={{ backgroundColor: cardColor.hex(), color: foreground }}>
            <CreditCardName className="absolute top-0 left-0 max-w-[70%] truncate text-xs tracking-[0.16em] opacity-75">
              {institutionName?.trim() || "\u00a0"}
            </CreditCardName>
            <CreditCardChip />
            <CreditCardNumber className="absolute bottom-[20%] left-0 text-lg tracking-[0.12em]">
              •••• •••• •••• {displayedLast4}
            </CreditCardNumber>
            <CreditCardName className="absolute bottom-0 left-0 max-w-[60%] truncate text-xs opacity-75">
              {name?.trim() || "\u00a0"}
            </CreditCardName>
            <CreditCardServiceProvider
              className="top-0 right-0 bottom-auto max-h-[18%] max-w-[24%]"
              format="logo"
              type={provider.paymentType}
            />
          </CreditCardFront>
          <CreditCardBack style={{ backgroundColor: cardColor.hex(), color: foreground }}>
            <CreditCardMagStripe />
            <CreditCardNumber className="absolute bottom-0 left-0 text-base tracking-[0.12em]">
              •••• •••• •••• {displayedLast4}
            </CreditCardNumber>
          </CreditCardBack>
        </CreditCardFlipper>
      </CreditCard>
    </div>
  );
}
