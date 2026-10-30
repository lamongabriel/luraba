"use client";

import type { Household } from "@luraba/contracts";

import { uploadContentUrl } from "@/lib/uploads";
import { cn } from "@/lib/utils";

import { DISPLAY_SIZES, type DisplaySize } from "./constants";
import { DisplayMark } from "./display-mark";

type HouseholdLike = Pick<Household, "name"> & { imageUploadId?: string | null };

function initialsOf(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "");
  return letters.join("") || "H";
}

/** The household's picture, or its initials when it has none. */
export function HouseholdMark({
  household,
  size = "sm",
  className,
}: {
  household: HouseholdLike;
  size?: DisplaySize;
  className?: string;
}) {
  return (
    <DisplayMark
      imageUrl={household.imageUploadId ? uploadContentUrl(household.imageUploadId) : null}
      fallback={
        <span className="text-[0.6em] font-semibold text-primary-foreground">
          {initialsOf(household.name)}
        </span>
      }
      size={size}
      className={cn("bg-primary text-primary-foreground", className)}
    />
  );
}

/** How a household is shown in lists: picture (or initials) + name. */
export function HouseholdDisplay({
  household,
  size = "md",
  className,
}: {
  household: HouseholdLike;
  size?: DisplaySize;
  className?: string;
}) {
  const dims = DISPLAY_SIZES[size];
  return (
    <span className={cn("flex min-w-0 items-center", dims.gap, className)}>
      <HouseholdMark household={household} size={size} />
      <span className={cn("block min-w-0 truncate font-medium", dims.text)}>{household.name}</span>
    </span>
  );
}
