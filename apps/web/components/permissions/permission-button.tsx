"use client"

import type { PermissionInput, PermissionMatch } from "@luraba/contracts"
import type * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { useCan } from "./use-can"

type ButtonProps = React.ComponentProps<typeof Button>

interface PermissionButtonExtraProps {
  permission: PermissionInput
  match?: PermissionMatch
  deniedMessage?: string
  whenDenied?: "disabled" | "hidden"
}

export type PermissionButtonProps = ButtonProps & PermissionButtonExtraProps

export function PermissionButton({
  permission,
  match,
  deniedMessage = "You don't have permission to do this",
  whenDenied = "disabled",
  disabled,
  className,
  ...buttonProps
}: PermissionButtonProps) {
  const can = useCan()
  const allowed = can(permission, match)

  if (allowed) {
    return <Button disabled={disabled} className={className} {...buttonProps} />
  }

  if (whenDenied === "hidden") {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-not-allowed">
          <Button
            {...buttonProps}
            disabled
            aria-disabled="true"
            className={cn(className, "pointer-events-none")}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{deniedMessage}</TooltipContent>
    </Tooltip>
  )
}
