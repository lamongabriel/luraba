"use client";

import {
  canManageMember,
  getAssignableRoles,
  HOUSEHOLD_ROLE_METADATA,
  type HouseholdMember,
  type HouseholdRole,
} from "@luraba/contracts";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateHouseholdMemberMutation } from "@/mutations/households/use-household-mutations";
import { authQueryKeys } from "@/queries/auth/use-auth-providers-query";
import { householdQueryKeys } from "@/queries/households/use-households-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { ChangeRoleDialog } from "./change-role-dialog";
import { RoleBadge } from "./role-badge";

/**
 * A member's role: a picker (with a confirmation that lists what changes) for people the signed-in
 * user may manage, a plain badge for everyone else. The rules are the API's, shared through
 * `@luraba/contracts`, so the UI never offers a change the server would refuse.
 */
export function MemberRoleControl({
  householdId,
  actorRole,
  member,
}: {
  householdId: string;
  actorRole: HouseholdRole;
  member: Pick<HouseholdMember, "userId" | "name" | "role">;
}) {
  const client = useQueryClient();
  const currentUserId = useAuthSessionStore((state) => state.user?.id);
  const [pending, setPending] = React.useState<HouseholdRole | null>(null);
  const isSelf = member.userId === currentUserId;
  const update = useUpdateHouseholdMemberMutation({
    onSuccess: async () => {
      setPending(null);
      toast.success(
        `${member.name} is now ${HOUSEHOLD_ROLE_METADATA[pending ?? member.role].label}`,
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: householdQueryKeys.members(householdId) }),
        // The signed-in user's own permissions may have changed.
        client.invalidateQueries({ queryKey: authQueryKeys.session }),
      ]);
    },
  });
  const options = getAssignableRoles(actorRole);
  const editable =
    canManageMember(actorRole, member.role, { self: isSelf }) && options.includes(member.role);

  if (!editable) {
    return (
      <span title={isSelf ? "You can't change your own role" : "You can't change this role"}>
        <RoleBadge role={member.role} />
      </span>
    );
  }

  return (
    <>
      <Select
        value={member.role}
        onValueChange={(value) => {
          if (value !== member.role) setPending(value as HouseholdRole);
        }}
      >
        <SelectTrigger className="h-7 w-28" aria-label={`Role of ${member.name}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((role) => (
            <SelectItem key={role} value={role}>
              {HOUSEHOLD_ROLE_METADATA[role].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending ? (
        <ChangeRoleDialog
          open
          onOpenChange={(open) => !open && setPending(null)}
          name={member.name}
          from={member.role}
          to={pending}
          isPending={update.isPending}
          onConfirm={() =>
            update.mutate({ householdId, userId: member.userId, body: { role: pending } })
          }
        />
      ) : null}
    </>
  );
}
