"use client"

import { CreateEditHouseholdForm } from "@/components/forms/create-edit-household-form/create-edit-household-form"
import { FormSheet } from "@/components/forms/form-sheet"
import type { HouseholdSummary } from "@/interfaces/household"
import type { CreateHouseholdHttpBody } from "@/interfaces/http/households-http"

export function HouseholdSettingsSheet({
  open,
  onOpenChange,
  household,
  onSubmit,
  isPending = false,
  mode = "edit",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  household?: HouseholdSummary | null
  onSubmit: (body: CreateHouseholdHttpBody) => void
  isPending?: boolean
  mode?: "create" | "edit"
}) {
  const isCreate = mode === "create"

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isCreate ? "Create household" : "Household settings"}
      description={
        isCreate
          ? "Set up the workspace identity and budgeting defaults for your household."
          : "Manage the identity and budgeting defaults shared by this household."
      }
      className="sm:max-w-2xl"
    >
      <CreateEditHouseholdForm
        open={open}
        household={household}
        mode={mode}
        onCancel={() => onOpenChange(false)}
        onSubmit={onSubmit}
        isPending={isPending}
      />
    </FormSheet>
  )
}
