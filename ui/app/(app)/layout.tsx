import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { formatMonthLabel, getCurrentMonthKey } from "@/lib/finance"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-border/60 bg-background/85 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">Money workspace</p>
              <p className="text-sm font-medium text-foreground">{formatMonthLabel(getCurrentMonthKey())}</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-full">
            Review month
          </Button>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
