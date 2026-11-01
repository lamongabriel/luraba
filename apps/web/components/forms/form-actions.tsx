import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The button row at the end of a form inside a sheet (`FormSheet`). It sticks to the bottom of the
 * sheet so the submit button is always visible while the form scrolls, and bleeds to the sheet's
 * edges. Put it as the last child of the `<form>`.
 */
export function FormActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="form-actions"
      className={cn(
        "sticky bottom-0 z-10 -mx-6 -mb-6 flex items-center justify-end gap-2 border-t border-border/70 bg-[var(--color-container)] px-6 py-4",
        className,
      )}
      {...props}
    />
  );
}
