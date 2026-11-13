"use client";

import { ArrowRight01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Dialog as DialogPrimitive, DropdownMenu as DropdownMenuPrimitive, Slot } from "radix-ui";
import * as React from "react";
import { BottomSheetBody, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Below 768px a dropdown menu is a bottom sheet (docs/ui-theme.md, "Drawers and menus on mobile"): the root becomes a
 * Radix Dialog, the content a `BottomSheetContent` and every item a full-width row of at least 44px. Trigger, content
 * and item APIs are unchanged (`onSelect(event)` still closes the menu unless `event.preventDefault()` is called;
 * checkbox and radio items behave the same). Sub menus open inline under their trigger. Positioning props and the
 * call site's `className` on the content (widths) are ignored on a phone. Opt out with `<DropdownMenu desktopOnly>`.
 */
type MobileMenu = { close: () => void };

const MobileMenuContext = React.createContext<MobileMenu | null>(null);
const MobileRadioContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
} | null>(null);
const MobileSubContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

const MOBILE_ITEM_CLASSES =
  "group/dropdown-menu-item relative flex min-h-11 w-full cursor-default items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-hidden select-none active:bg-accent focus-visible:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[variant=destructive]:text-destructive [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0";

function DropdownMenu({
  desktopOnly = false,
  open,
  defaultOpen,
  onOpenChange,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root> & {
  /** Keep the anchored dropdown on phones too. */
  desktopOnly?: boolean;
}) {
  const isMobile = useIsMobile() && !desktopOnly;
  const [innerOpen, setInnerOpen] = React.useState(defaultOpen ?? false);
  const controlled = open !== undefined;
  const current = controlled ? open : innerOpen;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!controlled) setInnerOpen(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );
  const menu = React.useMemo<MobileMenu>(() => ({ close: () => setOpen(false) }), [setOpen]);

  if (isMobile) {
    return (
      <MobileMenuContext.Provider value={menu}>
        <DialogPrimitive.Root data-slot="dropdown-menu" open={current} onOpenChange={setOpen}>
          {children}
        </DialogPrimitive.Root>
      </MobileMenuContext.Provider>
    );
  }
  return (
    <DropdownMenuPrimitive.Root
      data-slot="dropdown-menu"
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Root>
  );
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  const mobile = React.useContext(MobileMenuContext);
  if (mobile) return <>{props.children}</>;
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  const mobile = React.useContext(MobileMenuContext);
  if (mobile) {
    return <DialogPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
  }
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  align = "start",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  const mobile = React.useContext(MobileMenuContext);
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
      loop: _loop,
      children,
      ...sheetProps
    } = props;
    return (
      <BottomSheetContent
        data-slot="dropdown-menu-content"
        title={props["aria-label"] ?? "Menu"}
        description={false}
        {...(sheetProps as Omit<React.ComponentProps<typeof BottomSheetContent>, "title">)}
      >
        <BottomSheetBody className="pt-1 pb-2">
          <div role="menu" className="flex flex-col gap-0.5">
            {children}
          </div>
        </BottomSheetBody>
      </BottomSheetContent>
    );
  }
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 max-h-(--radix-dropdown-menu-content-available-height) w-(--radix-dropdown-menu-trigger-width) min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg p-1 text-popover-foreground ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:overflow-hidden data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  const mobile = React.useContext(MobileMenuContext);
  if (mobile) {
    const { asChild: _asChild, ...rest } = props;
    return <div role="group" data-slot="dropdown-menu-group" {...rest} />;
  }
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

/** Mobile row: a button that mimics Radix `onSelect(event)` and closes the sheet unless prevented. */
function MobileMenuButton({
  asChild,
  disabled,
  onSelect,
  onClick,
  onAction,
  role = "menuitem",
  textValue: _textValue,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "onSelect"> & {
  asChild?: boolean;
  onSelect?: (event: Event) => void;
  onAction?: () => void;
  textValue?: string;
}) {
  const mobile = React.useContext(MobileMenuContext);
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      {...(asChild ? {} : { type: "button" })}
      role={role}
      disabled={disabled}
      data-disabled={disabled ? "" : undefined}
      className={className}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented || disabled) return;
        onAction?.();
        const selectEvent = new Event("menu.itemSelect", { cancelable: true });
        onSelect?.(selectEvent);
        if (!selectEvent.defaultPrevented) mobile?.close();
      }}
      {...props}
    />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  const mobile = React.useContext(MobileMenuContext);
  if (mobile) {
    return (
      <MobileMenuButton
        data-slot="dropdown-menu-item"
        data-inset={inset}
        data-variant={variant}
        className={cn(MOBILE_ITEM_CLASSES, "data-[inset]:pl-8", className, "min-h-11")}
        {...(props as React.ComponentProps<typeof MobileMenuButton>)}
      />
    );
  }
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/dropdown-menu-item relative flex min-h-7 cursor-default items-center gap-2 rounded-md px-2 py-1 text-xs/relaxed outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7.5 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 data-[variant=destructive]:*:[svg]:text-destructive",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  onCheckedChange,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  const mobile = React.useContext(MobileMenuContext);
  if (mobile) {
    const isChecked = checked === true;
    return (
      <MobileMenuButton
        data-slot="dropdown-menu-checkbox-item"
        role="menuitemcheckbox"
        aria-checked={checked === "indeterminate" ? "mixed" : isChecked}
        data-state={isChecked ? "checked" : "unchecked"}
        className={cn(MOBILE_ITEM_CLASSES, "pr-9", className, "min-h-11")}
        onAction={() => onCheckedChange?.(!isChecked)}
        {...(props as React.ComponentProps<typeof MobileMenuButton>)}
      >
        {children}
        {isChecked ? (
          <HugeiconsIcon
            icon={Tick02Icon}
            strokeWidth={2}
            className="pointer-events-none absolute right-3"
          />
        ) : null}
      </MobileMenuButton>
    );
  }
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "relative flex min-h-7 cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-xs outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7.5 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      checked={checked}
      onCheckedChange={onCheckedChange}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center pointer-events-none"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  const mobile = React.useContext(MobileMenuContext);
  if (mobile) {
    const { value, onValueChange, asChild: _asChild, ...rest } = props;
    return (
      <MobileRadioContext.Provider value={{ value, onValueChange }}>
        <div role="group" data-slot="dropdown-menu-radio-group" {...rest} />
      </MobileRadioContext.Provider>
    );
  }
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  value,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  const mobile = React.useContext(MobileMenuContext);
  const radio = React.useContext(MobileRadioContext);
  if (mobile) {
    const isChecked = radio?.value === value;
    return (
      <MobileMenuButton
        data-slot="dropdown-menu-radio-item"
        role="menuitemradio"
        aria-checked={isChecked}
        data-state={isChecked ? "checked" : "unchecked"}
        className={cn(MOBILE_ITEM_CLASSES, "pr-9", className, "min-h-11")}
        onAction={() => radio?.onValueChange?.(value)}
        {...(props as React.ComponentProps<typeof MobileMenuButton>)}
      >
        {children}
        {isChecked ? (
          <HugeiconsIcon
            icon={Tick02Icon}
            strokeWidth={2}
            className="pointer-events-none absolute right-3"
          />
        ) : null}
      </MobileMenuButton>
    );
  }
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      value={value}
      className={cn(
        "relative flex min-h-7 cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-xs outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7.5 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center pointer-events-none"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  const mobile = React.useContext(MobileMenuContext);
  if (mobile) {
    const { asChild: _asChild, ...rest } = props;
    return (
      <div
        data-slot="dropdown-menu-label"
        data-inset={inset}
        className={cn(
          "text-muted-foreground px-3 py-2 text-xs font-medium data-[inset]:pl-8",
          className,
        )}
        {...rest}
      />
    );
  }
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn("px-2 py-1.5 text-xs text-muted-foreground data-inset:pl-7.5", className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  const mobile = React.useContext(MobileMenuContext);
  if (mobile) {
    const { asChild: _asChild, ...rest } = props;
    return (
      <hr
        data-slot="dropdown-menu-separator"
        className={cn("bg-border my-1 h-px", "border-0", className)}
        {...(rest as React.ComponentProps<"hr">)}
      />
    );
  }
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border/50", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-[0.625rem] tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground max-md:hidden",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  const mobile = React.useContext(MobileMenuContext);
  const [innerOpen, setInnerOpen] = React.useState(props.defaultOpen ?? false);
  if (mobile) {
    const open = props.open ?? innerOpen;
    const setOpen = (next: boolean) => {
      setInnerOpen(next);
      props.onOpenChange?.(next);
    };
    return (
      <MobileSubContext.Provider value={{ open, setOpen }}>
        <div data-slot="dropdown-menu-sub" className="flex flex-col gap-0.5">
          {props.children}
        </div>
      </MobileSubContext.Provider>
    );
  }
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  const sub = React.useContext(MobileSubContext);
  if (sub) {
    return (
      <button
        type="button"
        role="menuitem"
        aria-expanded={sub.open}
        data-slot="dropdown-menu-sub-trigger"
        data-inset={inset}
        data-state={sub.open ? "open" : "closed"}
        className={cn(MOBILE_ITEM_CLASSES, "data-[inset]:pl-8", className, "min-h-11")}
        onClick={() => sub.setOpen(!sub.open)}
        disabled={props.disabled}
      >
        {children}
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          strokeWidth={2}
          className={cn("ml-auto transition-transform", sub.open && "rotate-90")}
        />
      </button>
    );
  }
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex min-h-7 cursor-default items-center gap-2 rounded-md px-2 py-1 text-xs outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7.5 data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    >
      {children}
      <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="ml-auto" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  const sub = React.useContext(MobileSubContext);
  if (sub) {
    if (!sub.open) return null;
    return (
      <div
        role="menu"
        data-slot="dropdown-menu-sub-content"
        className="border-border ml-3 flex flex-col gap-0.5 border-l pl-1"
      >
        {props.children}
      </div>
    );
  }
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "z-50 min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-lg p-1 text-popover-foreground ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
