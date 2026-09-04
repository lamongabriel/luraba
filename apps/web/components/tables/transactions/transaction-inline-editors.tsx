"use client"

import type { TransactionFeedRow } from "@luraba/contracts"
import { ComboboxControl } from "@/components/forms/form-combobox"
import { TransactionTypeBadge } from "@/components/tables/transactions/transaction-type-badge"
import {
  TransactionLabelChip,
  UncategorizedChip,
} from "@/components/transactions/transaction-label-chip"
import { useTransactionInlineUpdates } from "@/components/transactions/use-transaction-inline-updates"
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query"

const UNCATEGORIZED_VALUE = "__uncategorized__"
const INLINE_TRIGGER_CLASS =
  "!h-5 !min-h-5 !w-fit !max-w-48 !rounded-full !border-0 !bg-transparent !px-0 !py-0 justify-start gap-1 text-xs shadow-none hover:!bg-transparent focus-visible:ring-1 focus-visible:ring-ring"
const INLINE_POPOVER_CLASS =
  "max-h-[min(28rem,var(--radix-popover-content-available-height))] rounded-md border border-border/70 p-0 shadow-none"

function isInlineEditable(row: TransactionFeedRow) {
  return (
    row.rowKind !== "credit_card_payment" && row.originType !== "adjustment"
  )
}

export function InlineCategoryCell({
  lookups,
  row,
}: {
  lookups: TransactionLookups
  row: TransactionFeedRow
}) {
  const { isPending, update } = useTransactionInlineUpdates(row)
  const category = lookups.categories.find((item) => item.id === row.categoryId)

  if (row.originType === "transfer") {
    return <TransactionTypeBadge type="transfer" />
  }

  if (!isInlineEditable(row)) {
    return category ? (
      <TransactionLabelChip entity={category} />
    ) : (
      <TransactionTypeBadge type={row.originType} />
    )
  }

  const options = [
    { value: UNCATEGORIZED_VALUE, label: "Uncategorized" },
    ...lookups.categories
      .filter(
        (item) =>
          item.type === (row.originType === "income" ? "income" : "expense"),
      )
      .map((item) => ({ value: item.id, label: item.name })),
  ]

  return (
    <div className="min-w-36">
      <ComboboxControl
        id={`category-${row.rowId}`}
        value={row.categoryId ?? UNCATEGORIZED_VALUE}
        options={options}
        onChange={(value) =>
          update({
            categoryId:
              value === UNCATEGORIZED_VALUE || value === row.categoryId
                ? null
                : value,
          })
        }
        disabled={isPending}
        placeholder="Uncategorized"
        searchPlaceholder="Search categories..."
        emptyMessage="No categories found."
        contentClassName={INLINE_POPOVER_CLASS}
        contentWidth="max-content"
        dataRowAction
        triggerClassName={INLINE_TRIGGER_CLASS}
        renderOption={(option) => {
          const optionCategory = lookups.categories.find(
            (item) => item.id === option.value,
          )
          return optionCategory ? (
            <TransactionLabelChip entity={optionCategory} />
          ) : (
            <UncategorizedChip />
          )
        }}
        renderValue={(option) => {
          const optionCategory = lookups.categories.find(
            (item) => item.id === option?.value,
          )
          return optionCategory ? (
            <TransactionLabelChip entity={optionCategory} />
          ) : (
            <UncategorizedChip />
          )
        }}
      />
    </div>
  )
}
