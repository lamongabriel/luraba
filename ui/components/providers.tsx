"use client"

import * as React from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"

import { TooltipProvider } from "@/components/ui/tooltip"
import { queryClient } from "@/lib/query-client"

export function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster closeButton position="top-right" richColors theme="dark" />
    </QueryClientProvider>
  )
}
