import Link from "next/link"
import { Home01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AuthGate } from "@/components/auth/auth-gate"
import { AppCommandMenu } from "@/components/navigation/app-command-menu"
import { AppSidebar } from "@/components/navigation/app-sidebar"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate mode="protected">
      <SidebarProvider>
        <AppSidebar />
        
        <SidebarInset>
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-xl">
            <div className="mx-auto flex min-h-16 w-full max-w-[1220px] items-center gap-3 px-4 md:px-6">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <Button asChild variant="outline" size="sm" className="rounded-xl border-border/80">
                  <Link href="/dashboard">
                    <HugeiconsIcon icon={Home01Icon} strokeWidth={2} className="size-4" />
                    Home
                  </Link>
                </Button>
              </div>
              <AppCommandMenu />
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-[1220px] flex-1 flex-col px-4 py-6 md:px-6 md:py-8">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGate>
  )
}
