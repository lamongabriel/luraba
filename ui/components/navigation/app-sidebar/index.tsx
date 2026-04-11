"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"

import { mainNav } from "@/lib/navigation"
import { NavUser } from "@/components/navigation/app-sidebar/nav-user"
import { Logo } from "@/components/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Typography } from "@/components/ui/typography"
import { useAuthStore } from "@/stores/auth.store"

export function AppSidebar() {
  const pathname = usePathname()
  const user = useAuthStore((state) => state.user)

  return (
    <Sidebar variant="sidebar">
      <SidebarHeader className="px-4 pt-4 pb-6">
        <Logo />
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup className="px-4">
          <SidebarMenu className="gap-2">
            {mainNav.map((item) => {
              const active = pathname === item.href

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                    <Link href={item.href}>
                      <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                      <Typography as="span" variant="sidebar-title">
                        {item.title}
                      </Typography>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
