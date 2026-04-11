"use client"

import * as React from "react"
import { QueryClientProvider } from "@tanstack/react-query"

import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { queryClient } from "@/lib/query-client"
import { useAuthStore } from "@/stores/auth.store"

export function Providers({ children }: { children: React.ReactNode }) {
  const logout = useAuthStore((state) => state.logout)
  const setBootstrapped = useAuthStore((state) => state.setBootstrapped)
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)

  React.useEffect(() => {
    if (!token || !user) {
      queryClient.clear()
      if (token || user) {
        logout()
      }
    }

    setBootstrapped(true)
  }, [logout, setBootstrapped, token, user])

  return (
    <ThemeProvider>
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
