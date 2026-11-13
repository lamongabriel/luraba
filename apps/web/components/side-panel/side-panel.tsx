"use client";

import type * as React from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function SidePanel({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {children}
    </Sheet>
  );
}

export function SidePanelContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SheetContent
      side="right"
      mobileClassName="h-[90dvh]"
      className={cn(
        "w-full overflow-hidden border-l border-border/70 bg-[var(--color-container)] data-[side=right]:sm:max-w-[46rem]",
        className,
      )}
    >
      {children}
    </SheetContent>
  );
}

export function SidePanelHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SheetHeader
      className={cn(
        "shrink-0 border-b border-border/70 pb-5 pl-6 pr-14 pt-6 max-md:pr-12 max-md:pl-4 max-md:pt-1 max-md:pb-3",
        className,
      )}
    >
      {children}
    </SheetHeader>
  );
}

export function SidePanelTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <SheetTitle className={cn("text-xl", className)}>{children}</SheetTitle>;
}

export function SidePanelDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <SheetDescription className={className}>{children}</SheetDescription>;
}

export function SidePanelBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="side-panel-body"
      className={cn(
        "min-h-0 min-w-0 flex-1 space-y-7 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-6 max-md:space-y-5 max-md:px-4 max-md:py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SidePanelFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SheetFooter
      className={cn(
        "shrink-0 border-t border-border/70 bg-[var(--color-container)] px-6 py-5 max-md:bg-background max-md:px-4 max-md:pt-3 max-md:pb-7 max-md:[&>button]:h-11",
        className,
      )}
    >
      {children}
    </SheetFooter>
  );
}
