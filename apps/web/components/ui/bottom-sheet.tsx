"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Pulling the handle down further than this (px) closes the sheet. */
export const BOTTOM_SHEET_DISMISS_DISTANCE = 96;

/**
 * Bottom padding of every sticky footer inside a bottom sheet: 12px of its own padding plus 16px extra, so the buttons sit
 * clear of the screen edge. The sheet itself adds `env(safe-area-inset-bottom)` below the footer, so on a phone with a home
 * indicator the buttons sit higher still. The footer keeps its background and the divider above it.
 */
export const SHEET_FOOTER_SPACE = "pb-7";

/**
 * The one mobile shell for every overlay (below 768px): a bottom sheet with a drag handle, at most 90dvh tall, a
 * scrolling body and safe-area padding. Popover, dropdown menu, select, the detail sidebar and the modals all render
 * through it on a phone, so the mobile look is decided here once.
 *
 * It is built on the same Radix Dialog as `Dialog`/`Sheet`, so `DialogClose`, `DialogTitle` and the portal container
 * keep working inside it.
 */
export interface BottomSheetContentProps
  extends Omit<React.ComponentProps<typeof DialogPrimitive.Content>, "title"> {
  /**
   * Accessible title, read by screen readers only. Omit it when the content renders its own visible `DialogTitle`
   * (two titles would be announced twice).
   */
  title?: string;
  /**
   * Accessible description. A string renders a screen-reader-only description; `false` declares there is none
   * (menus, lists); leave it out when the caller renders its own `DialogDescription`.
   */
  description?: string | false;
  /** Hides the drag handle. */
  hideHandle?: boolean;
  /** Where the overlay and sheet portal to. Default: the nearest modal's container, else `<body>`. */
  container?: HTMLElement | null;
}

export function BottomSheetContent({
  title,
  description,
  hideHandle = false,
  container,
  className,
  children,
  ref: outerRef,
  onOpenAutoFocus,
  ...props
}: BottomSheetContentProps) {
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const sheetRef = React.useRef<HTMLDivElement | null>(null);
  const drag = React.useRef<{ startY: number; dy: number } | null>(null);

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      sheetRef.current = node;
      if (typeof outerRef === "function") outerRef(node);
      else if (outerRef) (outerRef as React.RefObject<HTMLDivElement | null>).current = node;
    },
    [outerRef],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { startY: event.clientY, dy: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dy = Math.max(0, event.clientY - drag.current.startY);
    drag.current.dy = dy;
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`;
  };
  const endDrag = () => {
    const state = drag.current;
    drag.current = null;
    if (!sheetRef.current || !state) return;
    sheetRef.current.style.transition = "";
    if (state.dy > BOTTOM_SHEET_DISMISS_DISTANCE) closeRef.current?.click();
    else sheetRef.current.style.transform = "";
  };

  return (
    <DialogPrimitive.Portal container={container ?? undefined}>
      <DialogPrimitive.Overlay
        data-slot="bottom-sheet-overlay"
        className="fixed inset-0 z-50 bg-scrim duration-150 data-closed:animate-out data-closed:fade-out-0 data-open:animate-in data-open:fade-in-0"
      />
      <DialogPrimitive.Content
        data-slot="bottom-sheet"
        {...(description === false ? { "aria-describedby": undefined } : {})}
        {...props}
        // A sheet never opens the keyboard by itself: Radix would focus the first field (the search box of a select, the first
        // input of a form). The sheet takes the focus and the keyboard opens only when the user taps a field.
        onOpenAutoFocus={(event) => {
          onOpenAutoFocus?.(event);
          if (event.defaultPrevented) return;
          event.preventDefault();
          sheetRef.current?.focus({ preventScroll: true });
        }}
        data-bottom-sheet=""
        ref={setRefs}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-2xl border-t border-border bg-background text-sm shadow-lg outline-hidden",
          "pb-[env(safe-area-inset-bottom)] transition-transform duration-200",
          "data-closed:animate-out data-closed:slide-out-to-bottom data-open:animate-in data-open:slide-in-from-bottom",
          className,
        )}
      >
        {title === undefined ? null : (
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        )}
        {typeof description === "string" ? (
          <DialogPrimitive.Description className="sr-only">
            {description}
          </DialogPrimitive.Description>
        ) : null}
        {hideHandle ? null : (
          <div
            data-slot="bottom-sheet-handle"
            className="flex shrink-0 cursor-grab touch-none justify-center pt-2 pb-1 active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <span className="h-1.5 w-10 rounded-full bg-border" />
          </div>
        )}
        <DialogPrimitive.Close ref={closeRef} tabIndex={-1} aria-hidden className="sr-only" />
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Standard scrolling body of a bottom sheet: less side padding, spaced for thumbs. */
export function BottomSheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bottom-sheet-body"
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4", className)}
      {...props}
    />
  );
}
