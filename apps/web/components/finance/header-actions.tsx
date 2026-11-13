"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { PermissionInput } from "@luraba/contracts";
import Link from "next/link";
import type * as React from "react";

import { PermissionButton } from "@/components/permissions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The one size and shape of a page header control (month select, add button, secondary buttons): a pill 32px high
 * with an icon and a label from `md` up; below `md` a 36px circle with the icon only (the label stays as the
 * accessible name). Every control of the header's action group uses it, so they always line up.
 */
export const HEADER_CONTROL_CLASS =
  "h-8 max-md:size-9 max-md:gap-0 max-md:px-0 [&_svg:not([class*='size-'])]:size-4";

/** The label of a header control: visible from `md` up, screen-reader only on a phone. */
export function HeaderControlLabel({ children }: { children: React.ReactNode }) {
  return <span className="max-md:sr-only">{children}</span>;
}

/**
 * The primary action of a page ("Add budget"): the filled pill with a plus and the label on desktop, a filled circle
 * with the plus on a phone. At most one per page, always the last control of the header.
 */
export function HeaderAddButton({
  label,
  permission,
  deniedMessage,
  onClick,
  disabled,
  icon,
}: {
  label: string;
  permission: PermissionInput;
  deniedMessage?: string;
  onClick: () => void;
  disabled?: boolean;
  /** Another icon than the plus (for example "Import"). */
  icon?: React.ComponentProps<typeof HugeiconsIcon>["icon"];
}) {
  return (
    <PermissionButton
      permission={permission}
      deniedMessage={deniedMessage}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-header-control="primary"
      className={cn(HEADER_CONTROL_CLASS, "md:px-3")}
    >
      <HugeiconsIcon icon={icon ?? PlusSignIcon} strokeWidth={2} />
      <HeaderControlLabel>{label}</HeaderControlLabel>
    </PermissionButton>
  );
}

/**
 * A secondary action of a page header (export, filters, settings): the outlined pill with an icon and a label on
 * desktop, an outlined circle with the icon on a phone. `href` renders a link. `badge` is a count dot.
 */
export function HeaderButton({
  label,
  icon,
  onClick,
  href,
  disabled,
  badge,
  permission,
  deniedMessage,
}: {
  label: string;
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  badge?: number;
  /** When given, the button is disabled (with a tooltip) for roles without it. */
  permission?: PermissionInput;
  deniedMessage?: string;
}) {
  const content = (
    <>
      <HugeiconsIcon icon={icon} strokeWidth={2} />
      <HeaderControlLabel>{label}</HeaderControlLabel>
      {badge ? (
        <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[0.6rem] font-semibold text-primary-foreground ring-2 ring-background">
          {badge}
        </span>
      ) : null}
    </>
  );
  const className = cn(HEADER_CONTROL_CLASS, "relative bg-card md:px-3 dark:bg-input/30");
  if (href) {
    return (
      <Button
        asChild
        variant="outline"
        aria-label={label}
        data-header-control="secondary"
        className={className}
      >
        <Link href={href}>{content}</Link>
      </Button>
    );
  }
  if (permission) {
    return (
      <PermissionButton
        permission={permission}
        deniedMessage={deniedMessage}
        type="button"
        variant="outline"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        data-header-control="secondary"
        className={className}
      >
        {content}
      </PermissionButton>
    );
  }
  return (
    <Button
      type="button"
      variant="outline"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      data-header-control="secondary"
      className={className}
    >
      {content}
    </Button>
  );
}
