"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { motion } from "framer-motion"

import { mainNav } from "@/lib/navigation"
import { HouseholdSwitcher } from "@/components/navigation/app-sidebar/household-switcher"
import { NavUser } from "@/components/navigation/app-sidebar/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Typography } from "@/components/ui/typography"
import { showcaseAuthSession, showcaseHouseholds, showcaseUser } from "@/lib/mock-data"

const sidebarItemTransition = {
  damping: 22,
  stiffness: 320,
  type: "spring" as const,
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="sidebar">
      <SidebarHeader className="px-4 pt-4 pb-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <HouseholdSwitcher
            user={showcaseAuthSession.user}
            initialHousehold={showcaseAuthSession.household}
            households={showcaseHouseholds}
          />
        </motion.div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup className="px-4">
          <SidebarMenu className="gap-2">
            {mainNav.map((item) => {
              const active = pathname === item.href

              return (
                <SidebarMenuItem key={item.href}>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * (mainNav.indexOf(item) + 1), duration: 0.24, ease: "easeOut" }}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.985 }}
                  >
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="relative overflow-hidden bg-transparent shadow-none hover:bg-sidebar-accent/55"
                    >
                      <Link href={item.href}>
                        {active ? (
                          <motion.span
                            layoutId="sidebar-active-item"
                            className="absolute inset-0 rounded-[calc(var(--radius-sm)+2px)] bg-sidebar-accent/80"
                            transition={sidebarItemTransition}
                          />
                        ) : null}
                        <span className="relative z-10 flex items-center gap-2">
                          <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                          <Typography as="span" variant="sidebar-title">
                            {item.title}
                          </Typography>
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.26, ease: "easeOut" }}
        >
          <NavUser user={showcaseUser} />
        </motion.div>
      </SidebarFooter>
    </Sidebar>
  )
}
