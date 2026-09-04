"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { CreateHouseholdInput, HouseholdSummary } from "@luraba/contracts"
import * as React from "react"
import { useForm } from "react-hook-form"

import {
  type CreateEditHouseholdFormValues,
  createEditHouseholdFormSchema,
} from "./create-edit-household-form.schema"

const DEFAULT_VALUES: CreateEditHouseholdFormValues = {
  name: "",
  description: "",
  defaultCurrencyId: "USD",
  countryCode: "US",
  timezone: "UTC",
  budgetMonthStartsOn: 1,
  creditExpenseTiming: "spend_month",
  creditInstallmentBudgetMode: "per_installment",
}

function getDefaultValues(
  household?: HouseholdSummary | null,
): CreateEditHouseholdFormValues {
  if (!household) return DEFAULT_VALUES

  return {
    name: household.name,
    description: household.description ?? "",
    defaultCurrencyId: household.defaultCurrencyId,
    countryCode: household.countryCode,
    timezone: household.timezone,
    budgetMonthStartsOn: household.budgetMonthStartsOn,
    creditExpenseTiming: household.creditExpenseTiming,
    creditInstallmentBudgetMode: household.creditInstallmentBudgetMode,
  }
}

export function useCreateEditHouseholdForm({
  household,
  open,
  onSubmit,
}: {
  household?: HouseholdSummary | null
  open: boolean
  onSubmit: (body: CreateHouseholdInput) => void
}) {
  const form = useForm<CreateEditHouseholdFormValues>({
    defaultValues: getDefaultValues(household),
    resolver: zodResolver(createEditHouseholdFormSchema),
    mode: "onBlur",
  })

  React.useEffect(() => {
    if (open) form.reset(getDefaultValues(household))
  }, [form, household, open])

  const submit = form.handleSubmit((values) => {
    onSubmit({
      ...values,
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      defaultCurrencyId: values.defaultCurrencyId.toUpperCase(),
    })
  })

  return {
    form,
    submit,
    isEdit: Boolean(household),
  }
}
