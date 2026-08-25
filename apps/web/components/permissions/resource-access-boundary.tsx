"use client"

import { ViewOffSlashIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { useSafeBackHref } from "@/hooks/use-safe-back-href"
import { toAppClientError } from "@/services/error-client"

type ResourceAccessStatus = 403 | 404

interface ResourceUnavailableProps {
  resourceName: string
  status: ResourceAccessStatus
  backHref?: string
  backLabel?: string
}

interface ResourceAccessBoundaryProps
  extends Omit<ResourceUnavailableProps, "status"> {
  error: unknown
  fallback?: ReactNode
  children: ReactNode
}

export function getResourceAccessStatus(
  error: unknown,
): ResourceAccessStatus | null {
  if (!error) return null

  const status = toAppClientError(error).status
  return status === 403 || status === 404 ? status : null
}

export function isResourceAccessError(error: unknown) {
  return getResourceAccessStatus(error) !== null
}

export function ResourceUnavailable({
  resourceName,
  status,
  backHref,
  backLabel = "Go back",
}: ResourceUnavailableProps) {
  const router = useRouter()
  const safeBackHref = useSafeBackHref()
  const description =
    status === 403
      ? `Your role doesn't include permission to view this ${resourceName}.`
      : `This ${resourceName} doesn't exist or belongs to another household.`

  return (
    <div className="flex min-h-[26rem] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground">
          <HugeiconsIcon icon={ViewOffSlashIcon} className="size-5" />
        </div>
        <Typography as="h1" variant="section-title" className="mt-4">
          This {resourceName} isn&apos;t available
        </Typography>
        <Typography variant="body-muted" className="mt-2">
          {description}
        </Typography>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => router.push(backHref ?? safeBackHref)}
        >
          {backLabel}
        </Button>
      </div>
    </div>
  )
}

export function ResourceAccessBoundary({
  error,
  resourceName,
  backHref,
  backLabel,
  fallback = null,
  children,
}: ResourceAccessBoundaryProps) {
  const status = getResourceAccessStatus(error)

  if (status) {
    return (
      <ResourceUnavailable
        resourceName={resourceName}
        status={status}
        backHref={backHref}
        backLabel={backLabel}
      />
    )
  }

  if (error) return <>{fallback}</>

  return <>{children}</>
}
