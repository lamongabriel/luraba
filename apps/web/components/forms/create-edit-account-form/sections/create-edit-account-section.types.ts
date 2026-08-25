import type { UseFormReturn } from "react-hook-form"

import type { FormComboboxOption } from "@/components/forms/form-combobox"

import type { CreateEditAccountFormValues } from "../create-edit-account-form.schema"

export type CreateEditAccountSectionProps = {
  disabled: boolean
  form: UseFormReturn<CreateEditAccountFormValues>
}

export type CreateEditAccountCommonSectionProps =
  CreateEditAccountSectionProps & {
    currenciesArePending: boolean
    currencyOptions: FormComboboxOption[]
    isEdit: boolean
    typeOptions: { label: string; value: CreateEditAccountFormValues["type"] }[]
  }
