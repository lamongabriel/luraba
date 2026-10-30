"use client";

import {
  type CreateHouseholdInviteInput,
  getAssignableRoles,
  HOUSEHOLD_ROLE_METADATA,
  type HouseholdRole,
} from "@luraba/contracts";
import { Controller } from "react-hook-form";
import { FieldInfoHint } from "@/components/forms/field-info-hint";
import { FormItem } from "@/components/forms/form-item";
import { RolePicker } from "@/components/households/roles/role-picker";
import { Button } from "@/components/ui/button";

import { useCreateHouseholdInviteForm } from "./use-create-household-invite-form";

export function CreateHouseholdInviteForm({
  actorRole,
  onCancel,
  onSubmit,
  isPending = false,
}: {
  /** The inviter's role: only the roles they may hand out are offered. */
  actorRole: HouseholdRole;
  onCancel: () => void;
  onSubmit: (body: CreateHouseholdInviteInput) => void;
  isPending?: boolean;
}) {
  const { form, submit } = useCreateHouseholdInviteForm({ onSubmit });
  const roleOptions = getAssignableRoles(actorRole).filter(
    (role) => HOUSEHOLD_ROLE_METADATA[role].canBeInvited,
  );

  return (
    <form className="space-y-6" onSubmit={submit} noValidate>
      <FormItem
        control={form.control}
        name="name"
        label="Name (optional)"
        placeholder="John Doe"
        autoComplete="off"
        disabled={isPending}
      />
      <FormItem
        control={form.control}
        name="email"
        label="Email address"
        inputType="email"
        placeholder="person@example.com"
        autoComplete="email"
        disabled={isPending}
        labelAdornment={
          <FieldInfoHint>
            The secure invitation link will be addressed to this email. The recipient must
            authenticate with the same address to accept it.
          </FieldInfoHint>
        }
      />
      <div className="space-y-2">
        <p className="text-sm font-medium">Role</p>
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => (
            <RolePicker
              roles={roleOptions}
              value={field.value}
              onChange={field.onChange}
              disabled={isPending}
            />
          )}
        />
      </div>
      <div className="flex flex-col gap-3 border-t border-dashed border-border pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} loadingText="Sending invite...">
          Send invitation
        </Button>
      </div>
    </form>
  );
}
