"use client"

import type * as React from "react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "w-full overflow-y-auto border-l border-border/70 sm:max-w-xl bg-secondary/05",
          className,
        )}
      >
        <SheetHeader className="border-b border-dashed border-border pb-5">
          <SheetTitle className="text-xl">{title}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="px-6 py-6">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
