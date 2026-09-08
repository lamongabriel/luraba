"use client";

import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { HouseholdMember, HouseholdRole } from "@luraba/contracts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Typography } from "@/components/ui/typography";
import { formatDate } from "@/lib/format";
import { getHouseholdRoleLabel } from "@/lib/households";
import { cn } from "@/lib/utils";
import { useHouseholdRolesQuery } from "@/queries/households/use-households-query";

export interface UserDisplayUser {
  id?: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified?: boolean;
  role?: HouseholdRole;
  createdAt?: string;
  lastActiveAt?: string | null;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function UserDisplay({
  user,
  compact = false,
  className,
}: {
  user: UserDisplayUser;
  compact?: boolean;
  className?: string;
}) {
  const rolesQuery = useHouseholdRolesQuery({ enabled: Boolean(user.role) });
  const roles = rolesQuery.data ?? [];

  return (
    <HoverCard openDelay={250} closeDelay={120}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn("flex min-w-0 items-center gap-2 text-left", className)}
        >
          <Avatar className={compact ? "size-7" : "size-8"}>
            <AvatarImage src={user.image ?? undefined} alt="" />
            <AvatarFallback className="text-[0.65rem]">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="flex items-start gap-3">
          <Avatar size="lg">
            <AvatarImage src={user.image ?? undefined} alt="" />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Typography as="p" variant="small-strong" className="truncate">
              {user.name}
            </Typography>
            <Typography as="p" variant="small-muted" className="truncate">
              {user.email}
            </Typography>
          </div>
        </div>
        <div className="mt-4 grid gap-2 border-t border-border pt-3 text-xs">
          {user.role ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="outline">{getHouseholdRoleLabel(user.role, roles)}</Badge>
            </div>
          ) : null}
          {user.emailVerified !== undefined ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Email</span>
              <span className="inline-flex items-center gap-1">
                {user.emailVerified ? (
                  <>
                    <HugeiconsIcon icon={Tick02Icon} className="size-3.5 text-emerald-600" />{" "}
                    Verified
                  </>
                ) : (
                  "Not verified"
                )}
              </span>
            </div>
          ) : null}
          {user.createdAt ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Member since</span>
              <span>{formatDate(user.createdAt)}</span>
            </div>
          ) : null}
          {user.lastActiveAt ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Last active</span>
              <span>{formatDate(user.lastActiveAt)}</span>
            </div>
          ) : null}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function householdMemberToUserDisplay(member: HouseholdMember): UserDisplayUser {
  return member;
}
