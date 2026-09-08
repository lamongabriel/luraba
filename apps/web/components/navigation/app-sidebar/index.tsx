"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { HouseholdSwitcher } from "@/components/navigation/app-sidebar/household-switcher";
import { NavUser } from "@/components/navigation/app-sidebar/nav-user";
import { useCan } from "@/components/permissions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Typography } from "@/components/ui/typography";
import { logout } from "@/lib/auth/logout";
import { mainNav } from "@/lib/navigation";
import { queryClient } from "@/lib/query-client";
import { authQueryKeys } from "@/queries/auth/use-auth-providers-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

const sidebarItemTransition = {
  damping: 22,
  stiffness: 320,
  type: "spring" as const,
};

export function AppSidebar() {
  const pathname = usePathname();
  const can = useCan();
  const household = useAuthSessionStore((state) => state.household);
  const households = useAuthSessionStore((state) => state.households);
  const setActiveHouseholdId = useAuthSessionStore((state) => state.setActiveHouseholdId);
  const user = useAuthSessionStore((state) => state.user);

  const handleHouseholdChange = React.useCallback(
    (householdId: string) => {
      setActiveHouseholdId(householdId);
      void queryClient.invalidateQueries({ queryKey: authQueryKeys.session });
      void queryClient.invalidateQueries();
    },
    [setActiveHouseholdId],
  );

  const handleSignOut = React.useCallback(() => {
    void logout();
  }, []);

  if (!user || !household) {
    return null;
  }

  const navigationItems = mainNav.filter(({ permission }) => !permission || can(permission));

  return (
    <Sidebar variant="sidebar">
      <SidebarHeader className="px-4 pt-4 pb-3">
        <HouseholdSwitcher
          user={user}
          initialHousehold={household}
          households={households}
          onHouseholdChange={handleHouseholdChange}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-4">
          <SidebarMenu className="gap-2">
            {navigationItems.map((item, index) => {
              const active = pathname === item.href;

              return (
                <SidebarMenuItem key={item.href}>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.04 * (index + 1),
                      duration: 0.24,
                      ease: "easeOut",
                    }}
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
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          user={{
            email: user.email,
            name: user.name,
          }}
          onSignOut={handleSignOut}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
