"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";

import { BottomSheetContent, type BottomSheetContentProps } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { PortalContainerProvider } from "@/components/ui/portal-container";
import { cn } from "@/lib/utils";

export interface MobileSheetContentProps extends BottomSheetContentProps {
  /** Close (X) button in the corner. Default true. */
  showCloseButton?: boolean;
  /** Blocks closing with Escape and outside taps while something is saving. */
  isLoading?: boolean;
  /**
   * Render `children` as they are (the caller lays out a scrolling body and a sticky footer, e.g. `ModalContent`).
   * By default the children scroll inside a padded body.
   */
  bare?: boolean;
  /** Classes of the scrolling body (not the sheet). */
  bodyClassName?: string;
}

/**
 * The one mobile shell behind `DialogContent`, `SheetContent`, `ModalContent` and `SidePanelContent`: a
 * `BottomSheetContent` (drag handle, at most 90dvh, safe-area padding) with a close button, a scrolling body and the
 * sheet as portal container, so selects and popovers opened inside it keep working under the modal's
 * `pointer-events: none`. Call sites never use it directly; they render the usual Dialog/Sheet/Modal parts.
 */
export function MobileSheetContent({
  showCloseButton = true,
  isLoading = false,
  bare = false,
  bodyClassName,
  className,
  children,
  ref: outerRef,
  ...props
}: MobileSheetContentProps & { ref?: React.Ref<HTMLDivElement> }) {
  const [content, setContent] = React.useState<HTMLElement | null>(null);
  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      setContent(node);
      if (typeof outerRef === "function") outerRef(node);
      else if (outerRef) (outerRef as React.RefObject<HTMLDivElement | null>).current = node;
    },
    [outerRef],
  );
  const blockWhileLoading = isLoading
    ? {
        onEscapeKeyDown: (event: KeyboardEvent) => event.preventDefault(),
        onInteractOutside: (event: Event) => event.preventDefault(),
      }
    : {};

  return (
    <PortalContainerProvider value={content}>
      <BottomSheetContent
        {...blockWhileLoading}
        {...props}
        ref={setRefs}
        className={cn("max-md:max-w-none!", className)}
      >
        {showCloseButton ? (
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-2 right-2 z-10"
              disabled={isLoading}
              aria-label="Close"
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </Button>
          </DialogPrimitive.Close>
        ) : null}
        {bare ? (
          children
        ) : (
          <div
            data-slot="mobile-sheet-body"
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pt-1 pb-4",
              bodyClassName,
            )}
          >
            {children}
          </div>
        )}
      </BottomSheetContent>
    </PortalContainerProvider>
  );
}
