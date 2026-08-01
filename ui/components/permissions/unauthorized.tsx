"use client"

import { UserShield01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { useSafeBackHref } from "@/hooks/use-safe-back-href"
import { cn } from "@/lib/utils"

interface UnauthorizedProps {
  title?: string
  description?: string
  backHref?: string
  backLabel?: string
  fullPage?: boolean
}

export function Unauthorized({
  title = "Access denied",
  description = "Your role doesn't include permission to access this area.",
  backHref,
  backLabel = "Go back",
  fullPage = true,
}: UnauthorizedProps) {
  const router = useRouter()
  const safeBackHref = useSafeBackHref()

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fullPage ? "min-h-[calc(100svh-8rem)]" : "py-10",
      )}
    >
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground">
          <HugeiconsIcon icon={UserShield01Icon} className="size-5" />
        </div>
        <Typography as="h1" variant="section-title" className="mt-4">
          {title}
        </Typography>
        <Typography variant="body-muted" className="mt-2">
          {description}
        </Typography>
        {fullPage ? (
          <Button
            variant="outline"
            className="mt-6 shadow-none"
            onClick={() => router.push(backHref ?? safeBackHref)}
          >
            {backLabel}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
