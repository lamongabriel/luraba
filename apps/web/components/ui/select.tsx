"use client";

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Tick02Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Dialog as DialogPrimitive, Select as SelectPrimitive } from "radix-ui";
import * as React from "react";
import { BottomSheetBody, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { usePortalContainer } from "@/components/ui/portal-container";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Below 768px a select opens a bottom sheet with a scrollable list of full-width rows (copied from Nexus, see
 * components/ui/README.md). The Radix select stays mounted but never opens, so `SelectValue` keeps showing the
 * selected label; a tap on the trigger opens the sheet, and picking a row sets the value through the same
 * `value` / `onValueChange`. `SelectContent` renders its children twice on a phone: once into the closed Radix content,
 * once into the sheet, where `SelectItem` and friends render as plain rows. Opt out with `<Select desktopOnly>`.
 */
type MobileSelect = {
  mobile: boolean;
  value: string | undefined;
  select: (value: string) => void;
};

const MobileSelectContext = React.createContext<MobileSelect | null>(null);
const InSheetContext = React.createContext(false);

const MOBILE_OPTION_CLASSES =
  "relative flex min-h-11 w-full cursor-default items-center gap-2 rounded-md py-2 pr-9 pl-3 text-left text-sm outline-hidden select-none active:bg-accent focus-visible:bg-accent data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0";

function Select({
  desktopOnly = false,
  value,
  defaultValue,
  onValueChange,
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root> & {
  /** Keep the anchored select on phones too (opt-out, use sparingly and say why in a comment). */
  desktopOnly?: boolean;
}) {
  const isMobile = useIsMobile() && !desktopOnly;
  const [innerValue, setInnerValue] = React.useState(defaultValue);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const current = value ?? innerValue;

  const handleValueChange = React.useCallback(
    (next: string) => {
      setInnerValue(next);
      onValueChange?.(next);
    },
    [onValueChange],
  );
  const state = React.useMemo<MobileSelect>(
    () => ({
      mobile: isMobile,
      value: current,
      select: (next) => {
        handleValueChange(next);
        setSheetOpen(false);
      },
    }),
    [isMobile, current, handleValueChange],
  );

  return (
    <MobileSelectContext.Provider value={state}>
      <DialogPrimitive.Root open={isMobile && sheetOpen} onOpenChange={setSheetOpen}>
        <SelectPrimitive.Root
          data-slot="select"
          onValueChange={handleValueChange}
          {...(isMobile
            ? {
                value: current ?? "",
                open: false,
                onOpenChange: (next: boolean) => {
                  if (next) setSheetOpen(true);
                },
              }
            : { value, defaultValue, open, onOpenChange })}
          {...props}
        />
      </DialogPrimitive.Root>
    </MobileSelectContext.Provider>
  );
}

function SelectGroup({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  const inSheet = React.useContext(InSheetContext);
  if (inSheet) {
    const { asChild: _asChild, ...rest } = props;
    return (
      <div
        role="group"
        data-slot="select-group"
        className={cn("flex flex-col gap-0.5", className)}
        {...rest}
      />
    );
  }
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  );
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-full items-center justify-between gap-1.5 rounded-xl border border-border/90 bg-[var(--color-container-inset)] px-2.5 py-1 text-xs font-normal whitespace-nowrap shadow-none transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-7 data-[size=sm]:h-7 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <HugeiconsIcon
          icon={UnfoldMoreIcon}
          strokeWidth={2}
          className="pointer-events-none size-3.5 text-muted-foreground"
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "item-aligned",
  align = "center",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const portalContainer = usePortalContainer();
  const mobile = React.useContext(MobileSelectContext);
  const sheet = mobile?.mobile ? (
    <InSheetContext.Provider value>
      <BottomSheetContent
        data-slot="select-sheet"
        title={props["aria-label"] ?? "Select an option"}
        description={false}
        container={portalContainer ?? null}
      >
        <BottomSheetBody className="pt-1 pb-2">
          <div role="listbox" className="flex flex-col gap-0.5">
            {children}
          </div>
        </BottomSheetBody>
      </BottomSheetContent>
    </InSheetContext.Provider>
  ) : null;
  const desktop = (
    <SelectPrimitive.Portal container={portalContainer}>
      <SelectPrimitive.Content
        data-slot="select-content"
        data-align-trigger={position === "item-aligned"}
        className={cn(
          "z-50 max-h-(--radix-select-content-available-height) min-w-32 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg text-popover-foreground ring-1 ring-foreground/10 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          data-position={position}
          className={cn(
            "data-[position=popper]:h-(--radix-select-trigger-height) data-[position=popper]:w-full data-[position=popper]:min-w-(--radix-select-trigger-width)",
            position === "popper" && "",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
  return (
    <>
      {desktop}
      {sheet}
    </>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  const inSheet = React.useContext(InSheetContext);
  if (inSheet) {
    const { asChild: _asChild, ...rest } = props;
    return (
      <div
        data-slot="select-label"
        className={cn("px-3 py-2 text-xs text-muted-foreground", className)}
        {...rest}
      />
    );
  }
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  const inSheet = React.useContext(InSheetContext);
  const mobile = React.useContext(MobileSelectContext);
  if (inSheet && mobile) {
    const { value, disabled, textValue: _textValue, asChild: _asChild, ...rest } = props;
    const selected = mobile.value === value;
    return (
      <button
        type="button"
        role="option"
        aria-selected={selected}
        disabled={disabled}
        data-slot="select-item"
        data-state={selected ? "checked" : "unchecked"}
        data-disabled={disabled ? "" : undefined}
        className={cn(MOBILE_OPTION_CLASSES, className)}
        onClick={() => mobile.select(value)}
        {...(rest as React.ComponentProps<"button">)}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
        {selected ? (
          <HugeiconsIcon
            icon={Tick02Icon}
            strokeWidth={2}
            className="pointer-events-none absolute right-3"
          />
        ) : null}
      </button>
    );
  }
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-7 w-full cursor-default items-center gap-2 rounded-md px-2 py-1 text-xs/relaxed outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute right-2 flex items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="pointer-events-none" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  const inSheet = React.useContext(InSheetContext);
  if (inSheet) {
    return (
      <hr
        data-slot="select-separator"
        className={cn("my-1 h-px bg-border/50", "border-0", className)}
      />
    );
  }
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border/50", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    >
      <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    >
      <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
