"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { PermissionInput } from "@luraba/contracts";

import { PermissionButton } from "@/components/permissions";

/**
 * The primary "add" action of a page header: a small circular icon button below `md`, the labeled button
 * from `md` up. One component so Budgets, Goals and Bills all behave the same on a phone.
 */
export function PageAddButton({
  label,
  permission,
  deniedMessage,
  onClick,
  disabled,
}: {
  label: string;
  permission: PermissionInput;
  deniedMessage?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <PermissionButton
      permission={permission}
      deniedMessage={deniedMessage}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="size-9 p-0 md:h-8 md:w-auto md:px-3"
    >
      <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-4" />
      <span className="hidden md:inline">{label}</span>
    </PermissionButton>
  );
}
