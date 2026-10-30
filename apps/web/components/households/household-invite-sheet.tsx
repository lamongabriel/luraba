"use client";

import type { CreateHouseholdInviteInput, HouseholdRole } from "@luraba/contracts";
import { CreateHouseholdInviteForm } from "@/components/forms/create-household-invite-form/create-household-invite-form";
import { FormSheet } from "@/components/forms/form-sheet";

export function HouseholdInviteSheet({
  actorRole,
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
}: {
  actorRole: HouseholdRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: CreateHouseholdInviteInput) => void;
  isPending?: boolean;
}) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Invite member"
      description="Send a secure invitation link, and check exactly what the chosen role allows before you send it."
      className="sm:max-w-lg"
    >
      <CreateHouseholdInviteForm
        actorRole={actorRole}
        onCancel={() => onOpenChange(false)}
        onSubmit={onSubmit}
        isPending={isPending}
      />
    </FormSheet>
  );
}
