import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The button row at the end of a form inside a sheet (`FormSheet`). It sticks to the bottom of the
 * sheet's scrolling body (the header stays fixed above it), so the submit button is always visible while the form
 * scrolls; below `md` the buttons are full width and 44px tall, and bleeds to the sheet's
 * edges. Put it as the last child of the `<form>`.
 */
export function FormActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="form-actions"
      className={cn(
        "sticky bottom-0 z-10 -mx-6 -mb-6 flex items-center justify-end gap-2 border-t border-border/70 bg-[var(--color-container)] px-6 py-4 max-md:-mx-4 max-md:-mb-4 max-md:flex-col-reverse max-md:items-stretch max-md:bg-background max-md:px-4 max-md:pt-3 max-md:pb-7 max-md:[&>button]:h-11 max-md:[&>button]:w-full max-md:[&>button]:text-sm",
        className,
      )}
      {...props}
    />
  );
}
