"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { AuthGate } from "@/components/auth/auth-gate";
import { AppCommandMenu } from "@/components/navigation/app-command-menu";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardRoute = pathname === "/dashboard";

  return (
    <AuthGate mode="protected">
      <SidebarProvider>
        <AppSidebar />

        <SidebarInset>
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-xl">
            <div
              className={[
                "mx-auto flex min-h-16 w-full items-center gap-3 px-4 md:px-6",
                isDashboardRoute ? "max-w-none" : "max-w-[1220px]",
              ].join(" ")}
            >
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

          <div
            className={[
              "flex w-full flex-1 flex-col",
              isDashboardRoute
                ? "px-0 py-0"
                : "mx-auto max-w-[1220px] px-4 py-6 md:px-6 md:py-8",
            ].join(" ")}
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGate>
  );
}
