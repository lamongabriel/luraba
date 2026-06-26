"use client"

import Link from "next/link"
import { MoreVerticalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { userMenuLinks } from "@/lib/navigation"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { Typography } from "@/components/ui/typography"

interface NavUserProps {
  user: {
    name: string
    email: string
    role?: string
  } | null
  onSignOut?: () => void
}

export function NavUser({ user, onSignOut }: NavUserProps) {
  const { isMobile } = useSidebar()

  if (!user) return null

  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="rounded-xl px-3 py-2.5">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>

              <div className="grid min-w-0 flex-1 gap-0.5 text-left leading-tight">
                <Typography
                  as="span"
                  truncate
                  variant="small"
                  className="text-[0.78rem] font-medium normal-case tracking-normal text-sidebar-foreground"
                >
                  {user.name}
                </Typography>
                <Typography
                  as="span"
                  truncate
                  variant="small-muted"
                  className="text-[0.7rem] normal-case tracking-normal text-sidebar-foreground/60"
                >
                  {user.email}
                </Typography>
              </div>
              <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} className="ml-auto size-4 text-sidebar-foreground/45" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent side={isMobile ? "bottom" : "right"} align="end" sideOffset={8}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 gap-0.5 text-left leading-tight">
                  <Typography
                    as="span"
                    truncate
                    variant="small"
                    className="text-[0.8rem] font-medium normal-case tracking-normal text-foreground/78"
                  >
                    {user.name}
                  </Typography>
                  <Typography
                    as="span"
                    truncate
                    variant="small-muted"
                    className="text-[0.7rem] normal-case tracking-normal text-muted-foreground/78"
                  >
                    {user.email}
                  </Typography>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              {userMenuLinks.map((item) => (
                <DropdownMenuItem key={item.href + item.label} asChild>
                  <Link href={item.href}>
                    <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault()
                onSignOut?.()
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
