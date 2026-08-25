import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { cn } from "@/lib/utils"

const typographyVariants = cva("", {
  variants: {
    variant: {
      body: "text-sm leading-6 text-foreground",
      "body-muted": "text-sm leading-6 text-muted-foreground",
      lead: "text-base leading-7 text-muted-foreground",
      small: "text-xs text-foreground",
      "small-muted": "text-xs text-muted-foreground",
      "small-strong": "text-sm font-medium text-foreground",
      "small-destructive": "text-sm text-destructive",
      label:
        "text-[0.68rem] leading-none font-medium uppercase tracking-[0.18em] text-muted-foreground",
      eyebrow:
        "text-[0.7rem] font-medium uppercase tracking-[0.24em] text-muted-foreground",
      "sidebar-eyebrow":
        "text-[0.68rem] font-medium uppercase tracking-[0.22em] text-sidebar-foreground/55",
      "logo-subtitle":
        "text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground",
      title: "text-sm font-medium text-foreground",
      "sidebar-title": "text-sm font-medium text-sidebar-foreground",
      "sidebar-muted": "text-xs text-sidebar-foreground/55",
      "card-title":
        "font-heading text-sm font-medium tracking-[-0.01em] text-foreground",
      "section-title":
        "font-heading text-xl tracking-[-0.02em] text-foreground",
      subheading: "font-heading text-lg tracking-[-0.02em] text-foreground",
      "page-title":
        "font-heading text-2xl tracking-[-0.03em] text-foreground md:text-3xl md:leading-tight",
      "hero-title":
        "font-heading text-4xl tracking-[-0.04em] text-foreground md:text-[4.2rem] md:leading-[0.95]",
      metric: "text-2xl font-semibold tracking-tight text-foreground",
      mono: "font-medium tabular-nums text-foreground",
      meta: "text-xs uppercase tracking-[0.18em] text-muted-foreground",
      inverse: "text-sm leading-6 text-white",
      "inverse-small": "text-xs text-white/70",
      "inverse-label":
        "text-[0.62rem] font-medium uppercase tracking-[0.28em] text-white/60",
    },
    truncate: {
      true: "truncate",
    },
  },
  defaultVariants: {
    variant: "body",
  },
})

type TypographyProps<T extends React.ElementType> = {
  as?: T
  className?: string
} & VariantProps<typeof typographyVariants> &
  Omit<React.ComponentPropsWithoutRef<T>, "as" | "className">

function Typography<T extends React.ElementType = "p">({
  as,
  className,
  variant,
  truncate,
  ...props
}: TypographyProps<T>) {
  const Comp = as ?? "p"

  return (
    <Comp
      className={cn(typographyVariants({ variant, truncate }), className)}
      {...props}
    />
  )
}

export { Typography, typographyVariants }
