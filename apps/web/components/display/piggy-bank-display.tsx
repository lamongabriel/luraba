"use client";

import type { PiggyBankCoverPreset } from "@luraba/contracts";

import { uploadContentUrl } from "@/lib/uploads";
import { cn } from "@/lib/utils";

import {
  DISPLAY_SIZES,
  type DisplaySize,
  EMPTY_LABELS,
  PIGGY_BANK_COVER_DISPLAY,
  PIGGY_BANK_FALLBACK,
} from "./constants";
import { DisplayMark } from "./display-mark";

type PiggyBankLike = {
  title: string;
  coverUploadId?: string | null;
  coverPreset?: PiggyBankCoverPreset | null;
  emoji?: string | null;
  color?: string | null;
};

/** The picture of a piggy bank: the uploaded cover, else its emoji, else its preset icon, else the piggy icon. */
export function PiggyBankMark({
  piggyBank,
  size = "sm",
  className,
}: {
  piggyBank: Omit<PiggyBankLike, "title"> | null | undefined;
  size?: DisplaySize;
  className?: string;
}) {
  const preset = piggyBank?.coverPreset ? PIGGY_BANK_COVER_DISPLAY[piggyBank.coverPreset] : null;
  const color = piggyBank?.color ?? preset?.color ?? PIGGY_BANK_FALLBACK.color;
  const dims = DISPLAY_SIZES[size];
  return (
    <DisplayMark
      imageUrl={piggyBank?.coverUploadId ? uploadContentUrl(piggyBank.coverUploadId) : null}
      icon={preset?.icon ?? PIGGY_BANK_FALLBACK.icon}
      color={color}
      fallback={
        piggyBank?.emoji ? (
          <span aria-hidden="true" className={cn("leading-none", dims.text)}>
            {piggyBank.emoji}
          </span>
        ) : undefined
      }
      size={size}
      className={className}
    />
  );
}

/** How a piggy bank is shown everywhere: its cover and title on one compact line, optional muted `detail`. */
export function PiggyBankDisplay({
  piggyBank,
  size = "sm",
  detail,
  className,
  emptyLabel = EMPTY_LABELS.piggyBank,
}: {
  piggyBank: PiggyBankLike | null | undefined;
  size?: DisplaySize;
  detail?: React.ReactNode;
  className?: string;
  emptyLabel?: string;
}) {
  const dims = DISPLAY_SIZES[size];
  if (!piggyBank) {
    return <span className={cn("text-muted-foreground", dims.text, className)}>{emptyLabel}</span>;
  }
  return (
    <span className={cn("flex min-w-0 items-center", dims.gap, className)}>
      <PiggyBankMark piggyBank={piggyBank} size={size} />
      <span className={cn("min-w-0 truncate font-medium", dims.text)}>{piggyBank.title}</span>
      {detail ? (
        <span className={cn("shrink-0 text-muted-foreground", dims.text)}>{detail}</span>
      ) : null}
    </span>
  );
}
