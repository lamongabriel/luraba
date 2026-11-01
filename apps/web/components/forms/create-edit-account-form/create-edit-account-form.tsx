"use client";

import type { AccountDetails } from "@luraba/contracts";
import type * as React from "react";
import { FormActions } from "@/components/forms/form-actions";
import { FormItem } from "@/components/forms/form-item";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Typography } from "@/components/ui/typography";
import { CreateAccountStartingBalanceSection } from "./sections/create-account-starting-balance-section";
import { CreateEditAccountCommonSection } from "./sections/create-edit-account-common-section";
import { CreateEditAccountDetailsSection } from "./sections/create-edit-account-details-section";
import { useCreateEditAccountForm } from "./use-create-edit-account-form";

export function CreateEditAccountForm({
  account,
  defaultCurrencyCode,
  onCancel,
  onSuccess,
  editExtras,
}: {
  account?: AccountDetails;
  defaultCurrencyCode: string;
  onCancel: () => void;
  onSuccess: () => void;
  /** Extra sections for edit mode, shown above the buttons (balance adjustment, delete). */
  editExtras?: React.ReactNode;
}) {
  const { currenciesQuery, errorMessage, form, isEdit, isPending, onSubmit, type, typeOptions } =
    useCreateEditAccountForm({
      account,
      defaultCurrencyCode,
      onSuccess,
    });

  return (
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      <CreateEditAccountCommonSection
        form={form}
        disabled={isPending}
        isEdit={isEdit}
        typeOptions={typeOptions}
      />

      <CreateEditAccountDetailsSection form={form} disabled={isPending} />

      {!isEdit ? (
        <CreateAccountStartingBalanceSection form={form} disabled={isPending} type={type} />
      ) : null}

      <FormItem
        type="textarea"
        control={form.control}
        name="notes"
        label="Notes"
        placeholder="What is this account for?"
        disabled={isPending}
      />

      {currenciesQuery.isError ? (
        <FieldError>Couldn&apos;t load currencies right now.</FieldError>
      ) : null}
      {errorMessage ? <Typography variant="small-destructive">{errorMessage}</Typography> : null}

      {isEdit ? editExtras : null}

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isPending}
          loadingText={isEdit ? "Saving..." : "Creating account..."}
        >
          {isEdit ? "Save changes" : "Create account"}
        </Button>
      </FormActions>
    </form>
  );
}
