"use client"

import * as React from "react"
import { QueryClientProvider } from "@tanstack/react-query"

import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { queryClient } from "@/lib/query-client"
import { getCurrentUser, refresh } from "@/services/auth.service"
import { useAuthStore } from "@/stores/auth.store"

export function Providers({ children }: { children: React.ReactNode }) {
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)
  const setBootstrapped = useAuthStore((state) => state.setBootstrapped)

  React.useEffect(() => {
    let mounted = true

    void (async () => {
      try {
        const refreshData = await refresh()
        if (!mounted) return
        login(refreshData.user, refreshData.accessToken)
        const me = await getCurrentUser()
        if (!mounted) return
        login(me, refreshData.accessToken)
      } catch {
        if (!mounted) return
        logout()
      } finally {
        if (mounted) setBootstrapped(true)
      }
    })()

    return () => {
      mounted = false
    }
  }, [login, logout, setBootstrapped])

  return (
    <ThemeProvider>
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
