import { SaveMoneyDollarIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { type Control, Controller } from "react-hook-form"

import { FormItem } from "@/components/forms/form-item"
import { Button } from "@/components/ui/button"

import type { CreateEditTransactionFormValues } from "../create-edit-transaction-form.schema"
import { TransactionFormSection } from "./transaction-form-section"

export function SettingsSection({
  control,
  showBudget = true,
  showTags = true,
}: {
  control: Control<CreateEditTransactionFormValues>
  showBudget?: boolean
  showTags?: boolean
}) {
  if (!showBudget && !showTags) return null

  return (
    <TransactionFormSection title="Settings">
      {showTags ? (
        <FormItem
          type="tag"
          control={control}
          name="tagIds"
          label="Tags"
          placeholder="Choose tags"
        />
      ) : null}
      {showBudget ? (
        <Controller
          control={control}
          name="includeInBudget"
          render={({ field }) => (
            <Button
              type="button"
              variant={field.value ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => field.onChange(!field.value)}
            >
              <HugeiconsIcon icon={SaveMoneyDollarIcon} strokeWidth={2} />
              {field.value ? "Included in budget" : "Excluded from budget"}
            </Button>
          )}
        />
      ) : null}
    </TransactionFormSection>
  )
}
