"use client";

import { Dialog as DialogPrimitive, Popover as PopoverPrimitive, Slot } from "radix-ui";
import * as React from "react";

import { BottomSheetBody, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { usePortalContainer } from "@/components/ui/portal-container";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Below 768px a popover is a bottom sheet (components/ui/README.md, "Overlays on mobile"): `Popover` renders a Radix
 * Dialog root, `PopoverTrigger` its trigger and `PopoverContent` a `BottomSheetContent`. The API is the same, so no
 * call site changes. Positioning props (`side`, `align`, `sideOffset`...) are ignored on a phone and the call site's
 * `className` (widths, padding) goes on the sheet's inner wrapper at full width. Opt out with `<Popover desktopOnly>`.
 */
const MobilePopoverContext = React.createContext(false);

function Popover({
  desktopOnly = false,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root> & {
  /** Keep the anchored popover on phones too (opt-out, use sparingly and say why in a comment). */
  desktopOnly?: boolean;
}) {
  const isMobile = useIsMobile() && !desktopOnly;
  if (isMobile) {
    const { open, defaultOpen, onOpenChange, children } = props;
    return (
      <MobilePopoverContext.Provider value>
        <DialogPrimitive.Root
          data-slot="popover"
          open={open}
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
        >
          {children}
        </DialogPrimitive.Root>
      </MobilePopoverContext.Provider>
    );
  }
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  const mobile = React.useContext(MobilePopoverContext);
  if (mobile) return <DialogPrimitive.Trigger data-slot="popover-trigger" {...props} />;
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  const mobile = React.useContext(MobilePopoverContext);
  const portalContainer = usePortalContainer();

  if (mobile) {
    const {
      side: _side,
      alignOffset: _alignOffset,
      arrowPadding: _arrowPadding,
      avoidCollisions: _avoidCollisions,
      collisionBoundary: _collisionBoundary,
      collisionPadding: _collisionPadding,
      sticky: _sticky,
      hideWhenDetached: _hideWhenDetached,
      updatePositionStrategy: _updatePositionStrategy,
      ...sheetProps
    } = props;
    return (
      <BottomSheetContent
        data-slot="popover-content"
        title={props["aria-label"] ?? "Options"}
        description={false}
        container={portalContainer ?? null}
        {...(sheetProps as Omit<React.ComponentProps<typeof BottomSheetContent>, "title">)}
      >
        <BottomSheetBody className="pt-1">
          <div
            className={cn(
              "flex flex-col gap-4 text-xs",
              className,
              "max-md:w-full! max-md:max-w-none! max-md:min-w-0! max-md:p-0! [&_[data-slot=calendar]]:mx-auto",
            )}
          >
            {children}
          </div>
        </BottomSheetBody>
      </BottomSheetContent>
    );
  }

  return (
    <PopoverPrimitive.Portal container={portalContainer}>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 flex w-72 origin-(--radix-popover-content-transform-origin) flex-col gap-4 rounded-lg bg-popover p-2.5 text-xs text-popover-foreground ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
        )}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  const mobile = React.useContext(MobilePopoverContext);
  if (mobile) {
    const { asChild, virtualRef: _virtualRef, ...rest } = props;
    const Comp = asChild ? Slot.Root : "div";
    return <Comp data-slot="popover-anchor" {...rest} />;
  }
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-1 text-xs", className)}
      {...props}
    />
  );
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <div data-slot="popover-title" className={cn("text-sm font-medium", className)} {...props} />
  );
}

function PopoverDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="popover-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
};
