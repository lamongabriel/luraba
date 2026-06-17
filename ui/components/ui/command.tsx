"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { typographyVariants } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

function Command({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="command"
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-[1.5rem] border border-border/80 bg-[var(--color-surface)]/98 text-foreground shadow-[0_32px_110px_rgba(0,0,0,0.58)] backdrop-blur-xl",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return (
    <DialogPrimitive.Root data-slot="command-dialog" {...props}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-slot="command-overlay"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Content
          data-slot="command-content"
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-1.5rem)] max-w-xl -translate-x-1/2 outline-none"
        >
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search pages and quick actions.
          </DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function CommandInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex items-center gap-3 border-b border-border/70 px-4 py-3"
    >
      <HugeiconsIcon
        icon={Search01Icon}
        strokeWidth={2}
        className="size-4 text-muted-foreground"
      />
      <input
        data-slot="command-input"
        className={cn(
          "h-9 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CommandList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="command-list"
      className={cn("max-h-[24rem] overflow-y-auto p-2", className)}
      {...props}
    />
  )
}

function CommandEmpty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="command-empty"
      className={cn(
        "px-3 py-8 text-center",
        typographyVariants({ variant: "body-muted" }),
        className
      )}
      {...props}
    />
  )
}

function CommandGroup({
  heading,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  heading?: React.ReactNode
}) {
  return (
    <div data-slot="command-group" className={cn("px-1 pb-2", className)} {...props}>
      {heading ? (
        <div className={cn("px-2 pb-2 pt-3", typographyVariants({ variant: "label" }))}>
          {heading}
        </div>
      ) : null}
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function CommandSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="command-separator"
      className={cn("mx-3 my-2 h-px bg-border/60", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="command-item"
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.045] focus-visible:bg-white/[0.045] focus-visible:outline-none",
        className
      )}
      {...props}
    />
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(typographyVariants({ variant: "small-muted" }), "shrink-0", className)}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
}
