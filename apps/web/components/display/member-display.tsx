"use client";

import type { HouseholdMember } from "@luraba/contracts";

import { useMemberLookup } from "@/hooks/use-member-lookup";
import { cn } from "@/lib/utils";

import { DISPLAY_SIZES, type DisplaySize, EMPTY_LABELS } from "./constants";
import { DisplayMark } from "./display-mark";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/u).filter(Boolean);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}

/** A household member's picture, or their initials. */
export function MemberMark({
  member,
  size = "sm",
  className,
}: {
  member: Pick<HouseholdMember, "name" | "image"> | null | undefined;
  size?: DisplaySize;
  className?: string;
}) {
  return (
    <DisplayMark
      imageUrl={member?.image}
      rounded="full"
      size={size}
      className={className}
      fallback={
        <span className="text-[0.6rem] font-medium leading-none">
          {member ? initialsOf(member.name) : "?"}
        </span>
      }
    />
  );
}

/**
 * Who a record belongs to ("created by"), everywhere: picture or initials + name. Pass the record's
 * `createdByUserId`; people who left the household or old rows show "Unknown".
 */
export function MemberDisplay({
  userId,
  size = "sm",
  className,
  emptyLabel = EMPTY_LABELS.member,
}: {
  userId: string | null | undefined;
  size?: DisplaySize;
  className?: string;
  emptyLabel?: string;
}) {
  const { findMember } = useMemberLookup();
  const member = findMember(userId);
  const dims = DISPLAY_SIZES[size];

  if (!member) {
    return <span className={cn("text-muted-foreground", dims.text, className)}>{emptyLabel}</span>;
  }

  return (
    <span className={cn("flex min-w-0 items-center", dims.gap, className)}>
      <MemberMark member={member} size={size} />
      <span className={cn("truncate", dims.text)}>{member.name}</span>
    </span>
  );
}
