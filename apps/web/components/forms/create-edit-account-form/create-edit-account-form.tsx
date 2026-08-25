"use client"

import { FormItem } from "@/components/forms/form-item"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Typography } from "@/components/ui/typography"
import type { AccountDetails } from "@/interfaces/account"
import { CreateAccountStartingBalanceSection } from "./sections/create-account-starting-balance-section"
import { CreateEditAccountCommonSection } from "./sections/create-edit-account-common-section"
import { CreateEditAccountDetailsSection } from "./sections/create-edit-account-details-section"
import { useCreateEditAccountForm } from "./use-create-edit-account-form"

export function CreateEditAccountForm({
  account,
  defaultCurrencyCode,
  onCancel,
  onSuccess,
}: {
  account?: AccountDetails
  defaultCurrencyCode: string
  onCancel: () => void
  onSuccess: () => void
}) {
  const {
    currenciesQuery,
    errorMessage,
    form,
    isEdit,
    isPending,
    onSubmit,
    type,
    typeOptions,
  } = useCreateEditAccountForm({
    account,
    defaultCurrencyCode,
    onSuccess,
  })

  return (
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      <CreateEditAccountCommonSection
        form={form}
        disabled={isPending}
        isEdit={isEdit}
        typeOptions={typeOptions}
        currenciesArePending={currenciesQuery.isPending}
        currencyOptions={
          currenciesQuery.data?.data.map((currency) => ({
            value: currency.code,
            label: currency.code,
            description: currency.symbol,
          })) ?? []
        }
      />

      <CreateEditAccountDetailsSection form={form} disabled={isPending} />

      {!isEdit ? (
        <CreateAccountStartingBalanceSection
          form={form}
          disabled={isPending}
          type={type}
        />
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
      {errorMessage ? (
        <Typography variant="small-destructive">{errorMessage}</Typography>
      ) : null}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isPending}
          loadingText={isEdit ? "Saving..." : "Creating account..."}
        >
          {isEdit ? "Save changes" : "Create account"}
        </Button>
      </div>
    </form>
  )
}
