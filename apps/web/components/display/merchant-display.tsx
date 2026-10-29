"use client";

import type { Merchant } from "@luraba/contracts";

import { uploadContentUrl } from "@/lib/uploads";

import { cn } from "@/lib/utils";

import { DISPLAY_SIZES, type DisplaySize, EMPTY_LABELS, MERCHANT_FALLBACK } from "./constants";
import { DisplayMark } from "./display-mark";

/** Just the merchant's logo, or the shop icon when there is none. */
export function MerchantMark({
  merchant,
  size = "sm",
  className,
}: {
  merchant: (Pick<Merchant, "logoUrl"> & { imageUploadId?: string | null }) | null | undefined;
  size?: DisplaySize;
  className?: string;
}) {
  return (
    <DisplayMark
      imageUrl={
        merchant?.imageUploadId ? uploadContentUrl(merchant.imageUploadId) : merchant?.logoUrl
      }
      icon={MERCHANT_FALLBACK.icon}
      color={MERCHANT_FALLBACK.color}
      size={size}
      className={className}
    />
  );
}

/** How a merchant is shown everywhere: logo (or shop icon) + name, optionally its domain. */
export function MerchantDisplay({
  merchant,
  size = "sm",
  detail = "none",
  className,
  emptyLabel = EMPTY_LABELS.merchant,
}: {
  merchant:
    | (Pick<Merchant, "name" | "logoUrl" | "domain"> & { imageUploadId?: string | null })
    | null
    | undefined;
  size?: DisplaySize;
  detail?: "none" | "domain";
  className?: string;
  emptyLabel?: string;
}) {
  const dims = DISPLAY_SIZES[size];
  if (!merchant) {
    return <span className={cn("text-muted-foreground", dims.text, className)}>{emptyLabel}</span>;
  }

  return (
    <span className={cn("flex min-w-0 items-center", dims.gap, className)}>
      <MerchantMark merchant={merchant} size={size} />
      <span className="min-w-0">
        <span className={cn("block truncate font-medium", dims.text)}>{merchant.name}</span>
        {detail === "domain" && merchant.domain ? (
          <span className={cn("block truncate text-muted-foreground", dims.subtext)}>
            {merchant.domain}
          </span>
        ) : null}
      </span>
    </span>
  );
}
