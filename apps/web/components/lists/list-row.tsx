"use client";

import type * as React from "react";

import { cn } from "@/lib/utils";

/** Fixed row height (and its skeleton's): 32px mark (display size `md`), two text lines. */
export const LIST_ROW_HEIGHT_CLASS = "h-14";

export interface ListRowProps {
  /** A display mark (merchant logo, account icon...), built with `components/display`. */
  leading?: React.ReactNode;
  /** Primary line. Truncates. */
  title: React.ReactNode;
  /** Small icons after the title (note, installment...). */
  indicators?: React.ReactNode;
  /** Muted second line (account chip, category...). Truncates. */
  subtitle?: React.ReactNode;
  /** Trailing, top: the amount. */
  amount?: React.ReactNode;
  /** Trailing, bottom: the date or a status. */
  meta?: React.ReactNode;
  /** Trailing controls (a switch, a delete button). Tapping them never triggers `onClick`. */
  actions?: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  /** Spoken name of the row when it is tappable. */
  ariaLabel?: string;
  className?: string;
}

/**
 * One row of a mobile list: leading mark, title over a muted subtitle, amount over a date. Compact
 * (`h-14`), full-width touch target, never scrolls sideways. Build its content with the shared
 * display components; the row only lays it out.
 */
export function ListRow({
  leading,
  title,
  indicators,
  subtitle,
  amount,
  meta,
  actions,
  onClick,
  selected,
  ariaLabel,
  className,
}: ListRowProps) {
  const classes = cn(
    "flex w-full min-w-0 items-center gap-3 border-b border-border/60 px-1 text-left last:border-b-0",
    LIST_ROW_HEIGHT_CLASS,
    onClick && "cursor-pointer transition-colors active:bg-primary/15",
    selected && "bg-muted",
    className,
  );
  const content = (
    <>
      {leading ? <div className="flex shrink-0 items-center">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm/5 font-medium">{title}</span>
          {indicators ? (
            <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
              {indicators}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <div className="min-w-0 truncate text-xs/4 text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>
      {amount || meta ? (
        <div className="flex shrink-0 flex-col items-end">
          {amount ? <div className="text-sm/5 font-medium">{amount}</div> : null}
          {meta ? <div className="text-xs/4 text-muted-foreground">{meta}</div> : null}
        </div>
      ) : null}
      {actions ? (
        <div data-row-action className="flex shrink-0 items-center gap-1">
          {actions}
        </div>
      ) : null}
    </>
  );

  if (!onClick) {
    return (
      <div data-state={selected ? "selected" : undefined} className={classes}>
        {content}
      </div>
    );
  }
  return (
    // biome-ignore lint/a11y/useSemanticElements: the row holds block content and nested controls (actions), which a <button> cannot
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      data-state={selected ? "selected" : undefined}
      onClick={(event) => {
        if (event.defaultPrevented) return;
        if (event.target instanceof Element && event.target.closest("[data-row-action]")) return;
        onClick();
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={classes}
    >
      {content}
    </div>
  );
}

/** Day (or any group) header between runs of rows. Fixed height so skeletons can match it. */
export function ListGroupHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-8 items-end pb-1 text-xs/4 font-medium text-muted-foreground">
      {children}
    </div>
  );
}
