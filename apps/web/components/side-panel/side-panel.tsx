"use client"

import type * as React from "react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export function SidePanel({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {children}
    </Sheet>
  )
}

export function SidePanelContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <SheetContent
      side="right"
      className={cn(
        "w-full overflow-y-auto border-l border-border/70 bg-[var(--color-container)] data-[side=right]:sm:max-w-[46rem]",
        className,
      )}
    >
      {children}
    </SheetContent>
  )
}

export function SidePanelHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <SheetHeader
      className={cn(
        "border-b border-border/70 pb-5 pl-6 pr-14 pt-6",
        className,
      )}
    >
      {children}
    </SheetHeader>
  )
}

export function SidePanelTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <SheetTitle className={cn("text-xl", className)}>{children}</SheetTitle>
  )
}

export function SidePanelDescription({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <SheetDescription className={className}>{children}</SheetDescription>
}

export function SidePanelBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("space-y-7 px-6 py-6", className)}>{children}</div>
}

export function SidePanelFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <SheetFooter
      className={cn("border-t border-border/70 px-6 py-5", className)}
    >
      {children}
    </SheetFooter>
  )
}
