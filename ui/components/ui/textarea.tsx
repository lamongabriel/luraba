import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full resize-none rounded-xl border border-input bg-white/[0.04] px-3 py-2.5 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[background,border-color,box-shadow] outline-none placeholder:text-muted-foreground hover:border-white/12 focus-visible:border-ring focus-visible:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-xs/relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
