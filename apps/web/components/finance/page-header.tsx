import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import type * as React from "react"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  actions,
  className,
  backHref,
  backText,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  backHref?: string
  backText?: string
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {backHref ? (
          <Button asChild variant="link" className="mb-2 -ml-2 h-6 px-2">
            <Link href={backHref}>
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              {backText ?? "Back"}
            </Link>
          </Button>
        ) : null}
        <Typography as="h1" variant="page-title" className="max-w-3xl">
          {title}
        </Typography>
        {description ? (
          <Typography variant="body-muted" className="mt-1 max-w-3xl">
            {description}
          </Typography>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </section>
  )
}
