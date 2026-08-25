"use client"

import { CreateHouseholdInviteForm } from "@/components/forms/create-household-invite-form/create-household-invite-form"
import { FormSheet } from "@/components/forms/form-sheet"
import type { CreateHouseholdInviteHttpBody } from "@/interfaces/http/household-invites-http"

export function HouseholdInviteSheet({
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (body: CreateHouseholdInviteHttpBody) => void
  isPending?: boolean
}) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Invite member"
      description="Send a secure invitation link to someone who should have access to this household."
      className="sm:max-w-lg"
    >
      <CreateHouseholdInviteForm
        onCancel={() => onOpenChange(false)}
        onSubmit={onSubmit}
        isPending={isPending}
      />
    </FormSheet>
  )
}
