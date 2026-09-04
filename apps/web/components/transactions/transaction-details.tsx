"use client"

import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type {
  CreditCardPayment,
  CreditCardPurchase,
  TransactionFeedRow,
} from "@luraba/contracts"
import * as React from "react"
import { MoneyValue } from "@/components/finance/money-value"
import { ComboboxControl } from "@/components/forms/form-combobox"
import { TagSelectControl } from "@/components/forms/form-tag-select"
import { PERMISSIONS, PermissionButton } from "@/components/permissions"
import {
  SidePanelDetailRow,
  SidePanelSection,
  SidePanelSettingCard,
} from "@/components/side-panel/side-panel-section"
import { TransactionTypeBadge } from "@/components/tables/transactions/transaction-type-badge"
import {
  TransactionLabelChip,
  UncategorizedChip,
} from "@/components/transactions/transaction-label-chip"
import { useTransactionInlineUpdates } from "@/components/transactions/use-transaction-inline-updates"
import { Switch } from "@/components/ui/switch"
import { Typography } from "@/components/ui/typography"
import { formatShortDate } from "@/lib/format"
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query"
import { useAuthSessionStore } from "@/stores/auth-session-store"

const CLEAR_CATEGORY = "__uncategorized__"

export function TransactionDetails({
  lookups,
  onDelete,
  payment,
  purchase,
  row,
}: {
  lookups: TransactionLookups
  onDelete: () => void
  payment?: CreditCardPayment
  purchase?: CreditCardPurchase
  row: TransactionFeedRow
}) {
  const language = useAuthSessionStore(
    (state) => state.user?.preferences.language ?? "en",
  )
  const { isPending, update } = useTransactionInlineUpdates(row)
  const persistedIncludeInBudget =
    purchase?.includeInBudget ?? row.includeInBudget
  const [includeInBudget, setIncludeInBudget] = React.useState(
    persistedIncludeInBudget,
  )
  const categoryId = purchase?.categoryId ?? row.categoryId
  const persistedTagIds = React.useMemo(
    () => (purchase?.tags ?? row.tags).map((tag) => tag.id),
    [purchase?.tags, row.tags],
  )
  const [tagIds, setTagIds] = React.useState(persistedTagIds)
  const category = lookups.categories.find((item) => item.id === categoryId)
  const precision =
    lookups.currencies.find((item) => item.code === row.currencyCode)
      ?.precision ?? 2
  const toPrecision =
    lookups.currencies.find((item) => item.code === row.toCurrencyCode)
      ?.precision ?? 2

  React.useEffect(() => {
    setIncludeInBudget(persistedIncludeInBudget)
  }, [persistedIncludeInBudget])

  React.useEffect(() => {
    setTagIds(persistedTagIds)
  }, [persistedTagIds])

  const categoryOptions = [
    { value: CLEAR_CATEGORY, label: "Uncategorized" },
    ...lookups.categories
      .filter(
        (item) =>
          item.type === (row.originType === "income" ? "income" : "expense"),
      )
      .map((item) => ({ value: item.id, label: item.name })),
  ]

  return (
    <div className="space-y-7">
      <SidePanelSection title="Overview">
        <SidePanelDetailRow label="Type">
          <TransactionTypeBadge type={row.originType} />
        </SidePanelDetailRow>
        <SidePanelDetailRow label="Purchase date">
          {formatShortDate(row.purchaseDate, language)}
        </SidePanelDetailRow>
        <SidePanelDetailRow label="Posted date">
          {formatShortDate(row.postedDate, language)}
        </SidePanelDetailRow>
        {row.originType === "transfer" &&
        row.toAmount !== null &&
        row.toCurrencyCode ? (
          <SidePanelDetailRow label="Received">
            <MoneyValue
              amount={row.toAmount}
              currencyCode={row.toCurrencyCode}
              language={language}
              precision={toPrecision}
            />
          </SidePanelDetailRow>
        ) : null}
      </SidePanelSection>

      {row.rowKind !== "credit_card_payment" ? (
        <SidePanelSection title="Classification">
          <SidePanelDetailRow label="Category">
            {row.originType === "transfer" ? (
              <TransactionTypeBadge type="transfer" />
            ) : (
              <ComboboxControl
                id={`transaction-category-${row.rowId}`}
                value={categoryId ?? CLEAR_CATEGORY}
                options={categoryOptions}
                onChange={(value) =>
                  update({
                    categoryId: value === CLEAR_CATEGORY ? null : value,
                  })
                }
                disabled={isPending}
                placeholder="Uncategorized"
                searchPlaceholder="Search categories..."
                emptyMessage="No categories found."
                contentWidth="max-content"
                triggerClassName="h-7 w-fit min-w-28 rounded-full border-0 bg-transparent px-0 shadow-none hover:bg-transparent aria-expanded:bg-transparent"
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
                renderValue={() =>
                  category ? (
                    <TransactionLabelChip entity={category} />
                  ) : (
                    <UncategorizedChip />
                  )
                }
              />
            )}
          </SidePanelDetailRow>
          <SidePanelDetailRow label="Payment method">
            {row.paymentMethodName ?? "No payment method"}
          </SidePanelDetailRow>
          <SidePanelDetailRow label="Tags">
            <TagSelectControl
              id={`transaction-tags-${row.rowId}`}
              value={tagIds}
              onChange={(nextTagIds) => {
                const previousTagIds = tagIds
                setTagIds(nextTagIds)
                update(
                  { tagIds: nextTagIds },
                  { onError: () => setTagIds(previousTagIds) },
                )
              }}
              maxVisibleTags={1}
              placeholder="No tags"
              triggerClassName="h-7 min-h-7 w-fit min-w-24 max-w-full rounded-full border-0 bg-transparent px-0 shadow-none hover:bg-transparent aria-expanded:bg-transparent"
              popoverClassName="w-64"
            />
          </SidePanelDetailRow>
        </SidePanelSection>
      ) : null}

      {purchase ? (
        <SidePanelSection title="Installments">
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border/70">
            {purchase.installments.map((installment) => {
              const selected = installment.installmentId === row.installmentId
              return (
                <div
                  key={installment.installmentId}
                  className={`flex items-center justify-between gap-4 px-3 py-2.5 text-xs ${selected ? "bg-primary/8" : ""}`}
                >
                  <div className="min-w-0">
                    <Typography variant="small-strong">
                      Installment {installment.installmentNumber}
                    </Typography>
                    <Typography variant="small-muted">
                      {formatShortDate(installment.dueDate, language)}
                    </Typography>
                  </div>
                  <MoneyValue
                    amount={installment.amount}
                    currencyCode={row.currencyCode}
                    language={language}
                    precision={precision}
                  />
                </div>
              )
            })}
          </div>
        </SidePanelSection>
      ) : null}

      {payment && payment.allocations.length > 0 ? (
        <SidePanelSection title="Payment allocation">
          {payment.allocations.map((allocation) => (
            <SidePanelDetailRow
              key={allocation.billingCycleId}
              label="Billing cycle"
            >
              <MoneyValue
                amount={allocation.amount}
                currencyCode={row.currencyCode}
                language={language}
                precision={precision}
              />
            </SidePanelDetailRow>
          ))}
        </SidePanelSection>
      ) : null}

      {row.originType !== "adjustment" ? (
        <SidePanelSection title="Settings">
          {row.rowKind !== "credit_card_payment" ? (
            <SidePanelSettingCard
              title={
                includeInBudget ? "Included in budget" : "Excluded from budget"
              }
              description="Use this transaction in budget calculations."
            >
              <Switch
                checked={includeInBudget}
                disabled={isPending}
                onCheckedChange={(checked) => {
                  const previousValue = includeInBudget
                  setIncludeInBudget(checked)
                  update(
                    { includeInBudget: checked },
                    { onError: () => setIncludeInBudget(previousValue) },
                  )
                }}
                aria-label="Include transaction in budget"
              />
            </SidePanelSettingCard>
          ) : null}
          <SidePanelSettingCard
            title="Delete transaction"
            description={
              row.rowKind === "credit_card_installment"
                ? "Delete the parent purchase and every installment in its schedule."
                : "This transaction and its ledger entries will be permanently removed."
            }
            className="mt-2"
          >
            <PermissionButton
              permission={PERMISSIONS.TRANSACTIONS_DELETE}
              variant="destructive"
              size="sm"
              onClick={onDelete}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              Delete
            </PermissionButton>
          </SidePanelSettingCard>
        </SidePanelSection>
      ) : null}
    </div>
  )
}
