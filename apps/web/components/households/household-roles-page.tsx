"use client";

import {
  HOUSEHOLD_ROLE_METADATA,
  type HouseholdMember,
  type HouseholdRole,
  PERMISSIONS,
} from "@luraba/contracts";
import * as React from "react";
import { ErrorState } from "@/components/error-state";
import { MemberRoleControl } from "@/components/households/roles/member-role-control";
import { RoleBadge } from "@/components/households/roles/role-badge";
import { RoleMatrix } from "@/components/households/roles/role-matrix";
import { RolePermissions } from "@/components/households/roles/role-permissions";
import { useCan } from "@/components/permissions/use-can";
import { SectionCard } from "@/components/section/section-card";
import { householdMemberToUserDisplay, UserDisplay } from "@/components/users/user-display";
import { countRolePermissions, TOTAL_PERMISSIONS } from "@/lib/permission-catalog";
import { cn } from "@/lib/utils";
import {
  useHouseholdMembersQuery,
  useHouseholdQuery,
} from "@/queries/households/use-households-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

const ROLES: readonly HouseholdRole[] = ["owner", "admin", "member", "viewer"];

/**
 * What each role can do, side by side, and (for people allowed to see members) who has which role.
 * Roles are fixed; nothing here creates or edits a role, only who holds one.
 */
export function HouseholdRolesPage() {
  const householdId = useAuthSessionStore((state) => state.activeHouseholdId);
  const household = useHouseholdQuery(householdId);
  const can = useCan();
  const canSeeMembers = can(PERMISSIONS.HOUSEHOLD_MEMBERS_READ);
  const members = useHouseholdMembersQuery(
    householdId ?? "",
    { perPage: 100 },
    { enabled: canSeeMembers },
  );
  const [selected, setSelected] = React.useState<HouseholdRole | null>(null);

  if (household.isPending) {
    return (
      <div className="space-y-5">
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }
  if (household.isError || !household.data) {
    return (
      <ErrorState
        title="Couldn't load this household"
        description={household.error?.message ?? "The household may no longer be available."}
        onRetry={() => void household.refetch()}
      />
    );
  }

  const myRole = household.data.role;
  const active = selected ?? myRole;
  const rows: HouseholdMember[] = members.data?.data ?? [];
  const byRole = (role: HouseholdRole) => rows.filter((member) => member.role === role);

  return (
    <>
      <SectionCard
        title="Roles"
        description={`You are ${HOUSEHOLD_ROLE_METADATA[myRole].label.toLowerCase()} in this household. Pick a role to see everything it can do.`}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setSelected(role)}
              aria-pressed={role === active}
              className={cn(
                "space-y-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                role === active
                  ? "border-primary bg-muted/60 ring-1 ring-primary/40"
                  : "border-border",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <RoleBadge role={role} />
                {role === myRole ? (
                  <span className="text-[0.68rem] text-muted-foreground">Your role</span>
                ) : null}
              </span>
              <span className="block text-xs text-muted-foreground">
                {HOUSEHOLD_ROLE_METADATA[role].description}
              </span>
              <span className="block text-[0.68rem] text-muted-foreground">
                {countRolePermissions(role)} of {TOTAL_PERMISSIONS} permissions
                {canSeeMembers && members.data ? ` · ${byRole(role).length} people` : ""}
              </span>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={`What ${HOUSEHOLD_ROLE_METADATA[active].label.toLowerCase()}s can do`}
        description="Allowed actions are highlighted; crossed-out ones are not allowed."
      >
        <RolePermissions role={active} />
      </SectionCard>

      <SectionCard title="Compare roles" description="Every role, area by area.">
        <RoleMatrix />
      </SectionCard>

      {canSeeMembers ? (
        <SectionCard
          title="People by role"
          description="Who holds each role. Owners can change anyone; admins can change members and viewers."
        >
          {members.isPending ? (
            <div className="h-40 animate-pulse rounded-lg bg-muted" />
          ) : members.isError ? (
            <ErrorState
              title="Couldn't load members"
              description={members.error.message}
              onRetry={() => void members.refetch()}
            />
          ) : (
            <div className="space-y-5">
              {ROLES.map((role) => {
                const people = byRole(role);
                return (
                  <div key={role} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <RoleBadge role={role} />
                      <span className="text-xs text-muted-foreground">{people.length}</span>
                    </div>
                    {people.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nobody has this role.</p>
                    ) : (
                      <ul className="divide-y divide-border/60 rounded-lg border">
                        {people.map((member) => (
                          <li
                            key={member.id}
                            className="flex items-center justify-between gap-3 px-3 py-2"
                          >
                            <UserDisplay compact user={householdMemberToUserDisplay(member)} />
                            <MemberRoleControl
                              householdId={household.data.id}
                              actorRole={myRole}
                              member={member}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      ) : null}
    </>
  );
}
