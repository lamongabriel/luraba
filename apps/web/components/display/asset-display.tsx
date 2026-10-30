"use client";

import type { AssetClass } from "@luraba/contracts";

import { cn } from "@/lib/utils";

import { ASSET_CLASS_DISPLAY, DISPLAY_SIZES, type DisplaySize, EMPTY_LABELS } from "./constants";
import { DisplayMark } from "./display-mark";

/** Anything with the fields of an investment asset or a position. */
export type AssetDisplayInput = {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  logoUrl?: string | null;
};

/** Just the asset's logo, or the icon of its class. */
export function AssetMark({
  asset,
  size = "sm",
  className,
}: {
  asset: Pick<AssetDisplayInput, "assetClass" | "logoUrl"> | null | undefined;
  size?: DisplaySize;
  className?: string;
}) {
  const config = ASSET_CLASS_DISPLAY[asset?.assetClass ?? "OTHER"];
  return (
    <DisplayMark
      imageUrl={asset?.logoUrl}
      icon={config.icon}
      color={config.color}
      size={size}
      className={className}
    />
  );
}

/**
 * How an investment asset is shown everywhere: logo (or class icon) + symbol, with the name or the
 * class label under it.
 */
export function AssetDisplay({
  asset,
  size = "sm",
  detail = "name",
  className,
  emptyLabel = EMPTY_LABELS.asset,
}: {
  asset: AssetDisplayInput | null | undefined;
  size?: DisplaySize;
  detail?: "none" | "name" | "class";
  className?: string;
  emptyLabel?: string;
}) {
  const dims = DISPLAY_SIZES[size];
  if (!asset) {
    return <span className={cn("text-muted-foreground", dims.text, className)}>{emptyLabel}</span>;
  }

  return (
    <span className={cn("flex min-w-0 items-center", dims.gap, className)}>
      <AssetMark asset={asset} size={size} />
      <span className="min-w-0">
        <span className={cn("block truncate font-medium", dims.text)}>{asset.symbol}</span>
        {detail !== "none" ? (
          <span className={cn("block truncate text-muted-foreground", dims.subtext)}>
            {detail === "class" ? ASSET_CLASS_DISPLAY[asset.assetClass].label : asset.name}
          </span>
        ) : null}
      </span>
    </span>
  );
}
