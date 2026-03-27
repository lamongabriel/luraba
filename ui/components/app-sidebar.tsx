"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Settings } from "lucide-react"

import { mainNav } from "@/lib/navigation"
import { NavUser } from "@/components/nav-user"
import { Logo } from "@/components/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/stores/auth.store"

export function AppSidebar() {
  const pathname = usePathname()
  const user = useAuthStore((state) => state.user)
  const navUser = {
    name: user?.name ?? "Guest",
    email: user?.email ?? "",
    avatar: "",
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="gap-4 px-3 py-4">
        <Logo />
        <div className="rounded-[1.25rem] border border-sidebar-border/70 bg-sidebar-accent/50 px-3 py-3">
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-sidebar-foreground/60">Workspace</p>
          <p className="mt-2 text-sm font-medium text-sidebar-foreground">
            Accounts, cards, budgets, and cashflow in one place.
          </p>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup className="px-2">
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            {mainNav.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                    <Link href={item.href}>
                      <Icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-2 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <Link href="/settings">
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        <NavUser user={navUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
