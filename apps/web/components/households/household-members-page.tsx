"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CreateHouseholdInviteInput } from "@luraba/contracts";
import { PERMISSIONS } from "@luraba/contracts";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/error-state";
import { HouseholdInvitationsTable } from "@/components/households/household-invitations-table";
import { HouseholdInviteSheet } from "@/components/households/household-invite-sheet";
import { HouseholdMembersTable } from "@/components/households/household-members-table";
import { useCan } from "@/components/permissions/use-can";
import { SectionCard } from "@/components/section/section-card";
import { Button } from "@/components/ui/button";
import { useCreateHouseholdInviteMutation } from "@/mutations/households/use-household-mutations";
import { householdInviteQueryKeys } from "@/queries/households/use-household-invite-query";
import { useHouseholdQuery } from "@/queries/households/use-households-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

/** Members and outgoing invitations of the active household (`/household/members`). */
export function HouseholdMembersPage() {
  const client = useQueryClient();
  const householdId = useAuthSessionStore((state) => state.activeHouseholdId);
  const query = useHouseholdQuery(householdId);
  const can = useCan();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const invite = useCreateHouseholdInviteMutation({
    onSuccess: async () => {
      setInviteOpen(false);
      toast.success("Invitation sent");
      await client.invalidateQueries({ queryKey: householdInviteQueryKeys.lists() });
    },
  });
  const household = query.data;

  if (query.isPending) {
    return (
      <div className="space-y-5">
        <div className="h-12 animate-pulse rounded-lg bg-muted" />
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (query.isError || !household) {
    return (
      <ErrorState
        title="Couldn't load this household"
        description={query.error?.message ?? "The household may no longer be available."}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const canInvite = can(PERMISSIONS.HOUSEHOLD_INVITES_MANAGE);

  return (
    <>
      <SectionCard
        title="Members"
        description="Who can use this household."
        actions={
          canInvite ? (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} /> Invite member
            </Button>
          ) : null
        }
      >
        <HouseholdMembersTable householdId={household.id} householdRole={household.role} />
      </SectionCard>
      <SectionCard title="Outgoing invitations" description="Invitations that are still waiting.">
        <HouseholdInvitationsTable householdId={household.id} householdRole={household.role} />
      </SectionCard>
      <HouseholdInviteSheet
        actorRole={household.role}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmit={(body: CreateHouseholdInviteInput) =>
          invite.mutate({ householdId: household.id, body })
        }
        isPending={invite.isPending}
      />
    </>
  );
}
