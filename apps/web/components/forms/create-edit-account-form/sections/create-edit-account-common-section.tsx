"use client"

import { FieldInfoHint } from "@/components/forms/field-info-hint"
import { FormItem } from "@/components/forms/form-item"

import type { CreateEditAccountCommonSectionProps } from "./create-edit-account-section.types"

export function CreateEditAccountCommonSection({
  currenciesArePending,
  currencyOptions,
  disabled,
  form,
  isEdit,
  typeOptions,
}: CreateEditAccountCommonSectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormItem
        control={form.control}
        name="name"
        label="Name"
        placeholder="Main checking"
        disabled={disabled}
      />
      <FormItem
        type="select"
        control={form.control}
        name="type"
        label="Type"
        disabled={disabled || isEdit}
        options={typeOptions}
        description={
          isEdit ? "Type cannot be changed after creation." : undefined
        }
      />
      <FormItem
        type="combobox"
        control={form.control}
        name="currencyCode"
        label="Currency"
        placeholder="Select a currency"
        searchPlaceholder="Search currencies..."
        emptyMessage="No currencies found."
        disabled={disabled || currenciesArePending || isEdit}
        options={currencyOptions}
        description={
          isEdit ? "Currency cannot be changed after creation." : undefined
        }
      />
      <FormItem
        control={form.control}
        name="institutionName"
        label="Institution"
        placeholder="Chase"
        disabled={disabled}
      />
      <FormItem
        control={form.control}
        name="institutionDomain"
        label="Institution domain"
        placeholder="chase.com"
        disabled={disabled}
        labelAdornment={
          <FieldInfoHint>
            Used to load an institution logo when Brandfetch is configured.
          </FieldInfoHint>
        }
      />
    </div>
  )
}
