"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { FieldInfoHint } from "@/components/forms/field-info-hint"
import { FormItem } from "@/components/forms/form-item"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Typography } from "@/components/ui/typography"
import { CREATABLE_ACCOUNT_TYPE_OPTIONS } from "@/lib/accounts"
import { queryClient } from "@/lib/query-client"
import { useCreateAccountMutation } from "@/mutations/accounts/use-create-account-mutation"
import { accountQueryKeys } from "@/queries/accounts/use-accounts-query"
import { useCurrenciesQuery } from "@/queries/currencies/use-currencies-query"

import {
  type CreateAccountFormValues,
  createAccountFormSchema,
} from "./create-account-form.schema"

function getDefaultValues(
  defaultCurrencyCode: string,
): CreateAccountFormValues {
  return {
    currencyCode: defaultCurrencyCode,
    institutionDomain: "",
    institutionName: "",
    name: "",
    notes: "",
    type: "depository",
  }
}

export function CreateAccountForm({
  defaultCurrencyCode,
  onCancel,
  onSuccess,
}: {
  defaultCurrencyCode: string
  onCancel: () => void
  onSuccess: () => void
}) {
  const form = useForm<CreateAccountFormValues>({
    defaultValues: getDefaultValues(defaultCurrencyCode),
    resolver: zodResolver(createAccountFormSchema),
  })
  const currenciesQuery = useCurrenciesQuery()

  const createAccountMutation = useCreateAccountMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: accountQueryKeys.lists(),
      })
      form.reset(getDefaultValues(defaultCurrencyCode))
      onSuccess()
    },
    successToast: {
      title: "Account created",
      description: ({ variables }) =>
        `${variables.name} is now in your accounts list.`,
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    createAccountMutation.reset()
    createAccountMutation.mutate({
      currencyCode: values.currencyCode.trim().toUpperCase(),
      institutionDomain: values.institutionDomain.trim() || undefined,
      institutionName: values.institutionName.trim() || undefined,
      name: values.name.trim(),
      notes: values.notes.trim() || undefined,
      type: values.type,
    })
  })

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <FormItem
        control={form.control}
        name="name"
        label="Name"
        placeholder="Chase Checking"
        disabled={createAccountMutation.isPending}
        inputClassName="h-10 rounded-xl border-transparent bg-background/40 shadow-none"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormItem
          type="select"
          control={form.control}
          name="type"
          label="Type"
          placeholder="Select a type"
          disabled={createAccountMutation.isPending}
          triggerClassName="h-10 rounded-xl border-transparent bg-background/40 shadow-none"
          options={CREATABLE_ACCOUNT_TYPE_OPTIONS}
        />

        <div className="space-y-2">
          <FormItem
            type="combobox"
            control={form.control}
            name="currencyCode"
            label="Currency"
            placeholder={
              currenciesQuery.isPending
                ? "Loading currencies..."
                : "Select a currency"
            }
            searchPlaceholder="Search currencies..."
            emptyMessage="No currencies found."
            disabled={
              createAccountMutation.isPending || currenciesQuery.isPending
            }
            triggerClassName="h-10 rounded-xl border-transparent bg-background/40 shadow-none"
            options={
              currenciesQuery.data?.data.map((currency) => ({
                value: currency.code,
                label: currency.code,
                description: currency.symbol,
                searchText: `${currency.code} ${currency.symbol}`,
              })) ?? []
            }
            renderOption={(option) => (
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{option.label}</span>
                <span className="truncate text-[0.68rem] text-muted-foreground">
                  {option.description}
                </span>
              </span>
            )}
            renderValue={(option) =>
              option ? (
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{option.label}</span>
                  <span className="truncate text-[0.68rem] text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              ) : undefined
            }
          />
          {currenciesQuery.isError ? (
            <FieldError>Couldn&apos;t load currencies right now.</FieldError>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormItem
          control={form.control}
          name="institutionName"
          label="Institution"
          placeholder="Chase"
          disabled={createAccountMutation.isPending}
          inputClassName="h-10 rounded-xl border-transparent bg-background/40 shadow-none"
        />

        <FormItem
          control={form.control}
          name="institutionDomain"
          label="Domain"
          placeholder="chase.com"
          disabled={createAccountMutation.isPending}
          inputClassName="h-10 rounded-xl border-transparent bg-background/40 shadow-none"
          labelAdornment={
            <FieldInfoHint>
              Add the institution domain if you want us to try loading its logo
              automatically.
            </FieldInfoHint>
          }
        />
      </div>

      <FormItem
        type="textarea"
        control={form.control}
        name="notes"
        label="Notes"
        placeholder="What is this account for?"
        disabled={createAccountMutation.isPending}
        textareaClassName="min-h-28 rounded-[1.1rem] border-transparent bg-background/40 shadow-none"
        labelAdornment={
          <FieldInfoHint>
            Add any detail that helps you recognize this account later.
          </FieldInfoHint>
        }
      />

      {createAccountMutation.errorMessage ? (
        <Typography variant="small-destructive">
          {createAccountMutation.errorMessage}
        </Typography>
      ) : null}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          className="rounded-full shadow-none"
          onClick={onCancel}
          disabled={createAccountMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={createAccountMutation.isPending}
          loadingText="Creating account..."
          className="rounded-full border-transparent bg-primary text-primary-foreground shadow-none"
        >
          Create account
        </Button>
      </div>
    </form>
  )
}
