import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { Loader } from "@/components/ui/loader"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border bg-clip-padding text-xs/relaxed font-medium whitespace-nowrap transition-[background,border-color,color,transform,box-shadow] outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-primary/35 bg-linear-to-br from-primary via-primary/95 to-primary/80 text-primary-foreground shadow-[0_20px_48px_rgba(87,69,255,0.32)] hover:brightness-110",
        outline:
          "border-border bg-white/[0.03] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-primary/25 hover:bg-white/[0.055] aria-expanded:border-primary/25 aria-expanded:bg-white/[0.055]",
        secondary:
          "border-border/80 bg-secondary/75 text-secondary-foreground hover:border-white/12 hover:bg-secondary aria-expanded:bg-secondary",
        ghost:
          "border-transparent text-muted-foreground hover:bg-white/[0.045] hover:text-foreground aria-expanded:bg-white/[0.045] aria-expanded:text-foreground",
        destructive:
          "border-rose-500/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/16 focus-visible:border-rose-400/40 focus-visible:ring-rose-500/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-3 text-xs/relaxed has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        xs: "h-6 gap-1 rounded-lg px-2 text-[0.625rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-2.5",
        sm: "h-7 gap-1.5 px-2.5 text-xs/relaxed has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        lg: "h-10 gap-2 px-4 text-xs/relaxed has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-xs": "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-2.5",
        "icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-lg": "size-10 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean
      loading?: boolean
      loadingText?: React.ReactNode
    }
>(({ className, variant = "default", size = "default", asChild = false, loading = false, loadingText, children, disabled, ...props }, ref) => {
  const Comp = asChild ? Slot.Root : "button"
  const loaderSize = size === "lg" ? "xs" : size === "sm" || size === "xs" ? "xs" : "xs"

  return (
    <Comp
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      aria-busy={loading}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader
            size={loaderSize}
            label={typeof loadingText === "string" ? loadingText : "Loading"}
            className="border-current/30 border-t-current"
            containerClassName="text-current"
          />
          <span>{loadingText ?? children}</span>
        </span>
      ) : (
        children
      )}
    </Comp>
  )
})

Button.displayName = "Button"

export { Button, buttonVariants }
