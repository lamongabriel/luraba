"use client";

import {
  HOUSEHOLD_ROLE_METADATA,
  type HouseholdMember,
  type HouseholdRole,
  PERMISSIONS,
} from "@luraba/contracts";
import { ErrorState } from "@/components/error-state";
import { MemberRoleControl } from "@/components/households/roles/member-role-control";
import { RoleBadge } from "@/components/households/roles/role-badge";
import { RolePermissions } from "@/components/households/roles/role-permissions";
import { useCan } from "@/components/permissions/use-can";
import { SectionCard } from "@/components/section/section-card";
import { householdMemberToUserDisplay, UserDisplay } from "@/components/users/user-display";
import { summarizeRole } from "@/lib/permission-catalog";
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

  if (household.isPending) {
    return (
      <div className="space-y-5">
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
  const rows: HouseholdMember[] = members.data?.data ?? [];

  return (
    <SectionCard
      title="Roles"
      description={`You are ${HOUSEHOLD_ROLE_METADATA[myRole].label.toLowerCase()} in this household. Roles are fixed; open one to see exactly what it can do.`}
    >
      <ul className="divide-y divide-border/60">
        {ROLES.map((role) => {
          const people = rows.filter((member) => member.role === role);
          return (
            <li key={role} className="space-y-2 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <RoleBadge role={role} />
                {role === myRole ? (
                  <span className="text-[0.68rem] text-muted-foreground">Your role</span>
                ) : null}
                <span className="text-[0.68rem] text-muted-foreground sm:ml-auto">
                  {summarizeRole(role)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {HOUSEHOLD_ROLE_METADATA[role].description}
              </p>
              <details className="group text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  What {HOUSEHOLD_ROLE_METADATA[role].label.toLowerCase()}s can do
                </summary>
                <RolePermissions role={role} hideEmpty className="mt-2" />
              </details>
              {canSeeMembers && members.data ? (
                people.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nobody has this role.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {people.map((member) => (
                      <li key={member.id} className="flex items-center justify-between gap-3">
                        <UserDisplay compact user={householdMemberToUserDisplay(member)} />
                        <MemberRoleControl
                          householdId={household.data.id}
                          actorRole={myRole}
                          member={member}
                        />
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
      {canSeeMembers && members.isError ? (
        <ErrorState
          title="Couldn't load members"
          description={members.error.message}
          onRetry={() => void members.refetch()}
        />
      ) : null}
    </SectionCard>
  );
}
