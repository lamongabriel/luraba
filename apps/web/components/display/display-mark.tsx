"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";

import { cn } from "@/lib/utils";

import { DISPLAY_SIZES, type DisplayIcon, type DisplaySize } from "./constants";

/**
 * The small tile every display component starts with: a picture when there is one, otherwise an
 * icon (tinted) or a custom fallback such as a card brand logo. A picture that fails to load falls
 * back too.
 */
export function DisplayMark({
  imageUrl,
  icon,
  color,
  fallback,
  size = "sm",
  rounded = "md",
  className,
}: {
  imageUrl?: string | null;
  icon?: DisplayIcon;
  /** Tint for the icon and its tile. */
  color?: string | null;
  /** Replaces the icon (e.g. a brand logo). */
  fallback?: React.ReactNode;
  size?: DisplaySize;
  rounded?: "md" | "full";
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const dims = DISPLAY_SIZES[size];
  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden border border-border/70 bg-muted text-muted-foreground",
        dims.mark,
        rounded === "full" ? "rounded-full" : size === "lg" ? "rounded-xl" : "rounded-md",
        className,
      )}
      style={
        !showImage && color && !fallback
          ? { color, backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)` }
          : undefined
      }
    >
      {showImage ? (
        // biome-ignore lint/performance/noImgElement: user content from the API, not a static asset
        <img
          src={imageUrl ?? undefined}
          alt=""
          className="size-full object-cover"
          onError={() => setFailedUrl(imageUrl ?? null)}
        />
      ) : fallback ? (
        fallback
      ) : icon ? (
        <HugeiconsIcon icon={icon} strokeWidth={2} className={dims.glyph} />
      ) : null}
    </span>
  );
}
