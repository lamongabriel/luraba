"use client";

import type { CreateHouseholdInviteInput } from "@luraba/contracts";
import { FieldInfoHint } from "@/components/forms/field-info-hint";
import { FormItem } from "@/components/forms/form-item";
import { Button } from "@/components/ui/button";
import { useHouseholdRolesQuery } from "@/queries/households/use-households-query";

import { useCreateHouseholdInviteForm } from "./use-create-household-invite-form";

export function CreateHouseholdInviteForm({
  onCancel,
  onSubmit,
  isPending = false,
}: {
  onCancel: () => void;
  onSubmit: (body: CreateHouseholdInviteInput) => void;
  isPending?: boolean;
}) {
  const { form, submit } = useCreateHouseholdInviteForm({ onSubmit });
  const rolesQuery = useHouseholdRolesQuery();
  const roleOptions = rolesQuery.data?.filter((role) => role.canBeInvited) ?? [];

  return (
    <form className="space-y-6" onSubmit={submit} noValidate>
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
      <FormItem
        type="select"
        control={form.control}
        name="role"
        label="Role"
        options={roleOptions}
        disabled={isPending || rolesQuery.isPending}
        labelAdornment={
          <FieldInfoHint>
            Admins can manage members and invitations. Members can use the finance features allowed
            by their household permissions.
          </FieldInfoHint>
        }
      />
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
