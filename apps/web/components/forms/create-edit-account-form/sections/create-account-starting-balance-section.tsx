"use client"

import { FormItem } from "@/components/forms/form-item"
import { Typography } from "@/components/ui/typography"

import type { CreateEditAccountSectionProps } from "./create-edit-account-section.types"

type Props = CreateEditAccountSectionProps & {
  type: string
}

export function CreateAccountStartingBalanceSection({
  disabled,
  form,
  type,
}: Props) {
  return (
    <section className="space-y-3">
      <Typography variant="eyebrow">Starting balance</Typography>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormItem
          control={form.control}
          name="openingBalance"
          label={
            type === "loan" || type === "other_liability"
              ? "Amount owed"
              : "Opening balance"
          }
          inputType="number"
          step="0.01"
          disabled={disabled}
        />
        <FormItem
          control={form.control}
          name="balanceAsOfDate"
          label="Balance as of"
          inputType="date"
          disabled={disabled}
        />
      </div>
    </section>
  )
}
