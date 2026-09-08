"use client";

import type { CreateHouseholdInput, HouseholdSummary } from "@luraba/contracts";
import { CreateEditHouseholdForm } from "@/components/forms/create-edit-household-form/create-edit-household-form";
import { FormSheet } from "@/components/forms/form-sheet";

export function HouseholdSettingsSheet({
  open,
  onOpenChange,
  household,
  onSubmit,
  isPending = false,
  mode = "edit",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  household?: HouseholdSummary | null;
  onSubmit: (body: CreateHouseholdInput) => void;
  isPending?: boolean;
  mode?: "create" | "edit";
}) {
  const isCreate = mode === "create";

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
  );
}
