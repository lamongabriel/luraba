import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const loaderSpinnerVariants = cva(
  "animate-spin rounded-full border border-border/70 border-t-primary",
  {
    variants: {
      size: {
        xs: "size-4 border-[1.5px]",
        sm: "size-6 border-[1.5px]",
        md: "size-8 border-2",
        lg: "size-10 border-2",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
)

type LoaderProps = VariantProps<typeof loaderSpinnerVariants> & {
  className?: string
  containerClassName?: string
  fullPage?: boolean
  label?: string
}

export function Loader({
  size = "md",
  className,
  containerClassName,
  fullPage = false,
  label = "Loading",
}: LoaderProps) {
  const content = (
    <>
      <div
        aria-hidden="true"
        className={cn(loaderSpinnerVariants({ size }), className)}
      />
      <span className="sr-only">{label}</span>
    </>
  )

  if (fullPage) {
    return (
      <main
        className={cn(
          "flex min-h-dvh items-center justify-center px-4 py-8",
          containerClassName,
        )}
      >
        {content}
      </main>
    )
  }

  return (
    <div
      className={cn("inline-flex items-center justify-center", containerClassName)}
      role="status"
      aria-label={label}
    >
      {content}
    </div>
  )
}
