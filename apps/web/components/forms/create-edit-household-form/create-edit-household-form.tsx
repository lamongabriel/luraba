"use client"

import type { CreateHouseholdInput, HouseholdSummary } from "@luraba/contracts"
import { MAX_PER_PAGE } from "@luraba/contracts"
import { CountryCombobox } from "@/components/forms/country-combobox"
import { FieldInfoHint } from "@/components/forms/field-info-hint"
import type { FormComboboxOption } from "@/components/forms/form-combobox"
import { FormItem } from "@/components/forms/form-item"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Typography } from "@/components/ui/typography"
import { createTimezoneOptions } from "@/lib/timezones"
import { useCurrenciesQuery } from "@/queries/currencies/use-currencies-query"
import { useLocationOptionsQuery } from "@/queries/reference-data/use-location-options-query"

import { useCreateEditHouseholdForm } from "./use-create-edit-household-form"

export function CreateEditHouseholdForm({
  household,
  mode,
  open,
  onCancel,
  onSubmit,
  isPending = false,
}: {
  household?: HouseholdSummary | null
  mode: "create" | "edit"
  open: boolean
  onCancel: () => void
  onSubmit: (body: CreateHouseholdInput) => void
  isPending?: boolean
}) {
  const currenciesQuery = useCurrenciesQuery({ perPage: MAX_PER_PAGE })
  const locationOptionsQuery = useLocationOptionsQuery()
  const { form, submit, isEdit } = useCreateEditHouseholdForm({
    household,
    open,
    onSubmit,
  })

  const currencyOptions: FormComboboxOption[] =
    currenciesQuery.data?.data.map((currency) => ({
      value: currency.code,
      label: currency.code,
      description: currency.symbol,
      searchText: `${currency.code} ${currency.symbol}`,
    })) ?? []
  const timezoneOptions: FormComboboxOption[] = createTimezoneOptions(
    locationOptionsQuery.data?.timezones ?? [],
  )

  return (
    <form className="space-y-6" onSubmit={submit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormItem
          control={form.control}
          name="name"
          label="Name"
          placeholder="Gabriel's household"
          disabled={isPending}
        />
        <FormItem
          type="combobox"
          control={form.control}
          name="defaultCurrencyId"
          label="Default currency"
          placeholder="Select currency"
          searchPlaceholder="Search currencies..."
          emptyMessage="No currencies found."
          options={currencyOptions}
          disabled={isPending || currenciesQuery.isPending}
          labelAdornment={
            <FieldInfoHint>
              Used for household summaries and budget defaults.
            </FieldInfoHint>
          }
        />
      </div>

      <FormItem
        type="textarea"
        control={form.control}
        name="description"
        label="Description"
        placeholder="A short description for this household"
        rows={3}
        disabled={isPending}
        labelAdornment={
          <FieldInfoHint>
            Describe what this household is used for. This is visible to its
            members.
          </FieldInfoHint>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <CountryCombobox
          control={form.control}
          countries={locationOptionsQuery.data?.countries ?? []}
          name="countryCode"
          label="Country"
          disabled={
            isPending ||
            locationOptionsQuery.isPending ||
            locationOptionsQuery.isError
          }
          labelAdornment={
            <FieldInfoHint>
              Used for regional defaults and future locale-aware features.
            </FieldInfoHint>
          }
        />
        <FormItem
          type="combobox"
          control={form.control}
          name="timezone"
          label="Timezone"
          placeholder="Select timezone"
          searchPlaceholder="Search timezones..."
          emptyMessage="No timezones found."
          options={timezoneOptions}
          disabled={
            isPending ||
            locationOptionsQuery.isPending ||
            locationOptionsQuery.isError
          }
          labelAdornment={
            <FieldInfoHint>
              Controls calendar boundaries and date display for this household.
            </FieldInfoHint>
          }
        />
      </div>

      <FormItem
        type="select"
        control={form.control}
        name="budgetMonthStartsOn"
        label="Budget month starts on"
        placeholder="Select a day"
        options={Array.from({ length: 31 }, (_, index) => ({
          value: String(index + 1),
          label: `Day ${index + 1}`,
        }))}
        parseValue={(value) => Number(value)}
        labelAdornment={
          <FieldInfoHint>
            Each budget month begins on this calendar day. Shorter months clamp
            to their last valid day.
          </FieldInfoHint>
        }
        disabled={isPending}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormItem
          type="select"
          control={form.control}
          name="creditExpenseTiming"
          label="Credit-card expense timing"
          options={[
            { value: "spend_month", label: "Month spent" },
            { value: "payment_month", label: "Month paid" },
          ]}
          labelAdornment={
            <FieldInfoHint>
              Choose whether credit-card expenses belong to the purchase month
              or the payment month.
            </FieldInfoHint>
          }
          disabled={isPending}
        />
        <FormItem
          type="select"
          control={form.control}
          name="creditInstallmentBudgetMode"
          label="Installment budget mode"
          options={[
            { value: "per_installment", label: "Each installment" },
            { value: "full_amount", label: "Full amount upfront" },
          ]}
          labelAdornment={
            <FieldInfoHint>
              Decide whether a purchase is recognized one installment at a time
              or in full when it is created.
            </FieldInfoHint>
          }
          disabled={isPending}
        />
      </div>

      {currenciesQuery.isError || locationOptionsQuery.isError ? (
        <FieldError>
          Some household options could not be loaded. Try again before saving.
        </FieldError>
      ) : null}
      {form.formState.isSubmitted &&
      Object.keys(form.formState.errors).length > 0 ? (
        <Typography variant="small-destructive">
          Check the highlighted fields before saving.
        </Typography>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-dashed border-border pt-5 sm:flex-row sm:justify-end">
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
          loadingText={isEdit ? "Saving..." : "Creating..."}
        >
          {mode === "create" ? "Create household" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
