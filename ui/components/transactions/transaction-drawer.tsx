"use client"

import {
  CreditCardIcon,
  Delete02Icon,
  Exchange01Icon,
  PencilEdit02Icon,
  SaveMoneyDollarIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { format as formatDateFns } from "date-fns"
import * as React from "react"

import { FormSheet } from "@/components/finance/forms/form-sheet"
import { MoneyValue } from "@/components/finance/money-value"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type { TransactionFeedRow } from "@/interfaces/transaction"
import {
  useCreateCreditCardPaymentMutation,
  useCreateCreditCardPurchaseMutation,
  useDeleteCreditCardPaymentMutation,
  useDeleteCreditCardPurchaseMutation,
  useUpdateCreditCardPaymentMutation,
  useUpdateCreditCardPurchaseMutation,
} from "@/mutations/credit-cards/use-credit-card-transaction-mutations"
import {
  useCreateTransactionMutation,
  useDeleteTransactionMutation,
  useUpdateTransactionMutation,
} from "@/mutations/transactions/use-transaction-mutations"
import { accountQueryKeys } from "@/queries/accounts/use-accounts-query"
import { creditCardQueryKeys } from "@/queries/credit-cards/use-credit-cards-query"
import {
  type TransactionLookups,
  transactionLookupQueryKeys,
} from "@/queries/transactions/use-transaction-lookups-query"
import { transactionQueryKeys } from "@/queries/transactions/use-transactions-query"
import {
  getCreditCardPayment,
  getCreditCardPurchase,
} from "@/services/credit-cards.service"
import { useAuthSessionStore } from "@/stores/auth-session-store"

type DrawerMode = "create" | "edit" | "view"
type TransactionsLookups = TransactionLookups
type TransactionFormKind =
  | "expense"
  | "income"
  | "transfer"
  | "credit_card_purchase"
  | "credit_card_payment"

interface TransactionFormState {
  accountId: string
  amount: string
  categoryId: string
  creditCardId: string
  description: string
  fromAccountId: string
  includeInBudget: boolean
  installmentCount: string
  kind: TransactionFormKind
  merchantId: string
  paymentMethodCode: string
  postedDate: string
  purchaseDate: string
  tagIds: string[]
  toAccountId: string
  toAmount: string
}

interface TransactionDrawerProps {
  mode: DrawerMode
  onModeChange: (mode: DrawerMode) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  row?: TransactionFeedRow | null
  lookups: TransactionsLookups
}

interface TransactionDetails {
  payment?: Awaited<ReturnType<typeof getCreditCardPayment>>
  purchase?: Awaited<ReturnType<typeof getCreditCardPurchase>>
}

function today() {
  return formatDateFns(new Date(), "yyyy-MM-dd")
}

function centsToInput(amount?: number | null) {
  if (!amount) return ""
  return (amount / 100).toFixed(2)
}

function inputToCents(value: string) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? Math.round(numericValue * 100) : 0
}

function getInitialState(): TransactionFormState {
  const date = today()

  return {
    accountId: "",
    amount: "",
    categoryId: "",
    creditCardId: "",
    description: "",
    fromAccountId: "",
    includeInBudget: true,
    installmentCount: "1",
    kind: "expense",
    merchantId: "",
    paymentMethodCode: "",
    postedDate: date,
    purchaseDate: date,
    tagIds: [],
    toAccountId: "",
    toAmount: "",
  }
}

function getKindFromRow(row: TransactionFeedRow): TransactionFormKind {
  if (row.rowKind === "credit_card_installment") return "credit_card_purchase"
  if (row.rowKind === "credit_card_payment") return "credit_card_payment"
  if (row.originType === "transfer") return "transfer"
  if (row.originType === "income") return "income"
  return "expense"
}

function getStateFromRow(
  row: TransactionFeedRow,
  details: TransactionDetails,
): TransactionFormState {
  const kind = getKindFromRow(row)
  const purchase = details.purchase
  const payment = details.payment

  return {
    accountId: row.accountId ?? "",
    amount: centsToInput(purchase?.amount ?? payment?.amount ?? row.amount),
    categoryId: purchase?.categoryId ?? row.categoryId ?? "",
    creditCardId:
      row.creditCardId ?? purchase?.creditCardId ?? payment?.creditCardId ?? "",
    description:
      purchase?.description ?? payment?.description ?? row.description,
    fromAccountId: payment?.fromAccountId ?? row.accountId ?? "",
    includeInBudget: row.includeInBudget,
    installmentCount: String(
      purchase?.installmentCount ?? row.installmentCount ?? 1,
    ),
    kind,
    merchantId: purchase?.merchantId ?? row.merchantId ?? "",
    paymentMethodCode: row.paymentMethodCode ?? "",
    postedDate: purchase?.postedDate ?? payment?.postedDate ?? row.postedDate,
    purchaseDate:
      purchase?.purchaseDate ?? payment?.paymentDate ?? row.purchaseDate,
    tagIds: row.tags.map((tag) => tag.id),
    toAccountId: row.toAccountId ?? "",
    toAmount: centsToInput(row.toAmount),
  }
}

function FieldGroup({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-[0.68rem] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
        {title}
      </h3>
      <div className="space-y-3 rounded-[1.25rem] border border-border/70 bg-background/30 p-3">
        {children}
      </div>
    </section>
  )
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right font-medium">{value}</span>
    </div>
  )
}

function TextField({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string
  onChange: (value: string) => void
  type?: React.HTMLInputTypeAttribute
  value: string
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl bg-background/45"
      />
    </div>
  )
}

function SelectField({
  label,
  onChange,
  options,
  placeholder = "Select",
  value,
}: {
  label: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  placeholder?: string
  value: string
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="w-full rounded-xl bg-background/45">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function TagPicker({
  selectedIds,
  lookups,
  onChange,
}: {
  selectedIds: string[]
  lookups: TransactionsLookups
  onChange: (tagIds: string[]) => void
}) {
  if (lookups.tags.length === 0) {
    return null
  }

  return (
    <div className="space-y-1.5">
      <Label>Tags</Label>
      <div className="flex flex-wrap gap-1.5">
        {lookups.tags.map((tag) => {
          const selected = selectedIds.includes(tag.id)

          return (
            <Button
              key={tag.id}
              type="button"
              variant={selected ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() =>
                onChange(
                  selected
                    ? selectedIds.filter((tagId) => tagId !== tag.id)
                    : [...selectedIds, tag.id],
                )
              }
            >
              {tag.name}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function getAccountCurrency(
  lookups: TransactionsLookups,
  accountId: string,
  fallback: string,
) {
  return (
    lookups.accounts.find((account) => account.id === accountId)
      ?.currencyCode ?? fallback
  )
}

export function TransactionDrawer(props: TransactionDrawerProps) {
  const { open, row } = props
  const purchaseQuery = useQuery({
    enabled: open && Boolean(row?.creditCardId && row?.purchaseId),
    queryKey: ["credit-cards", row?.creditCardId, "purchases", row?.purchaseId],
    queryFn: () =>
      getCreditCardPurchase({
        creditCardId: row?.creditCardId ?? "",
        purchaseId: row?.purchaseId ?? "",
      }),
  })
  const paymentQuery = useQuery({
    enabled: open && Boolean(row?.creditCardId && row?.paymentId),
    queryKey: ["credit-cards", row?.creditCardId, "payments", row?.paymentId],
    queryFn: () =>
      getCreditCardPayment({
        creditCardId: row?.creditCardId ?? "",
        paymentId: row?.paymentId ?? "",
      }),
  })
  const detailsKey =
    purchaseQuery.data?.purchaseId ?? paymentQuery.data?.paymentId ?? "feed-row"

  return (
    <TransactionDrawerContent
      key={`${props.mode}:${row?.id ?? "new"}:${detailsKey}`}
      {...props}
      purchase={purchaseQuery.data}
      payment={paymentQuery.data}
    />
  )
}

function TransactionDrawerContent({
  mode,
  onModeChange,
  onOpenChange,
  open,
  row,
  lookups,
  payment,
  purchase,
}: TransactionDrawerProps & TransactionDetails) {
  const queryClient = useQueryClient()
  const language = useAuthSessionStore(
    (state) => state.user?.preferences.language ?? "en",
  )
  const defaultCurrencyCode = useAuthSessionStore(
    (state) => state.household?.settings.defaultCurrencyId ?? "BRL",
  )
  const [form, setForm] = React.useState(() =>
    mode === "create" || !row
      ? getInitialState()
      : getStateFromRow(row, { payment, purchase }),
  )

  const refresh = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: creditCardQueryKeys.lists() }),
      queryClient.invalidateQueries({
        queryKey: transactionLookupQueryKeys.all,
      }),
    ])
  }, [queryClient])

  const onMutationSuccess = React.useCallback(async () => {
    await refresh()
    onOpenChange(false)
  }, [onOpenChange, refresh])

  const createTransactionMutation = useCreateTransactionMutation({
    onSuccess: onMutationSuccess,
    successToast: { title: "Transaction created" },
    errorToast: true,
  })
  const updateTransactionMutation = useUpdateTransactionMutation({
    onSuccess: onMutationSuccess,
    successToast: { title: "Transaction updated" },
    errorToast: true,
  })
  const deleteTransactionMutation = useDeleteTransactionMutation({
    onSuccess: onMutationSuccess,
    successToast: { title: "Transaction deleted" },
    errorToast: true,
  })
  const createPurchaseMutation = useCreateCreditCardPurchaseMutation({
    onSuccess: onMutationSuccess,
    successToast: { title: "Credit card purchase created" },
    errorToast: true,
  })
  const updatePurchaseMutation = useUpdateCreditCardPurchaseMutation({
    onSuccess: onMutationSuccess,
    successToast: { title: "Credit card purchase updated" },
    errorToast: true,
  })
  const deletePurchaseMutation = useDeleteCreditCardPurchaseMutation({
    onSuccess: onMutationSuccess,
    successToast: { title: "Credit card purchase deleted" },
    errorToast: true,
  })
  const createPaymentMutation = useCreateCreditCardPaymentMutation({
    onSuccess: onMutationSuccess,
    successToast: { title: "Credit card payment created" },
    errorToast: true,
  })
  const updatePaymentMutation = useUpdateCreditCardPaymentMutation({
    onSuccess: onMutationSuccess,
    successToast: { title: "Credit card payment updated" },
    errorToast: true,
  })
  const deletePaymentMutation = useDeleteCreditCardPaymentMutation({
    onSuccess: onMutationSuccess,
    successToast: { title: "Credit card payment deleted" },
    errorToast: true,
  })

  const nonCreditAccounts = lookups.accounts.filter(
    (account) => account.type !== "credit_card",
  )
  const accountOptions = nonCreditAccounts.map((account) => ({
    label: `${account.name} · ${account.currencyCode}`,
    value: account.id,
  }))
  const creditCardOptions = lookups.creditCards.map((card) => ({
    label: `${card.name} · ${card.currencyCode}`,
    value: card.id,
  }))
  const categoryOptions = lookups.categories
    .filter((category) =>
      form.kind === "income"
        ? category.type === "income"
        : category.type === "expense",
    )
    .map((category) => ({
      label: category.name,
      value: category.id,
    }))
  const merchantOptions = [
    { label: "No merchant", value: "none" },
    ...lookups.merchants.map((merchant) => ({
      label: merchant.name,
      value: merchant.id,
    })),
  ]
  const paymentMethodOptions = lookups.paymentMethods.map((method) => ({
    label: method.name,
    value: method.code,
  }))
  const selectedCurrencyCode =
    form.kind === "credit_card_purchase" || form.kind === "credit_card_payment"
      ? (lookups.creditCards.find((card) => card.id === form.creditCardId)
          ?.currencyCode ?? defaultCurrencyCode)
      : getAccountCurrency(
          lookups,
          form.accountId || form.fromAccountId,
          defaultCurrencyCode,
        )
  const viewCategoryName = row?.categoryId
    ? lookups.categories.find((category) => category.id === row.categoryId)
        ?.name
    : undefined
  const viewMerchantName = row?.merchantId
    ? lookups.merchants.find((merchant) => merchant.id === row.merchantId)?.name
    : undefined
  const isMutating =
    createTransactionMutation.isPending ||
    updateTransactionMutation.isPending ||
    deleteTransactionMutation.isPending ||
    createPurchaseMutation.isPending ||
    updatePurchaseMutation.isPending ||
    deletePurchaseMutation.isPending ||
    createPaymentMutation.isPending ||
    updatePaymentMutation.isPending ||
    deletePaymentMutation.isPending

  const patchForm = React.useCallback(
    (patch: Partial<TransactionFormState>) => {
      setForm((current) => ({ ...current, ...patch }))
    },
    [],
  )

  const submit = React.useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()

      const amount = inputToCents(form.amount)
      const toAmount = inputToCents(form.toAmount)
      const merchantId =
        form.merchantId && form.merchantId !== "none"
          ? form.merchantId
          : undefined

      if (form.kind === "credit_card_purchase") {
        if (!form.creditCardId) return

        const body = {
          amount,
          categoryId: form.categoryId,
          description: form.description,
          installmentCount: Number(form.installmentCount) || 1,
          merchantId,
          postedDate: form.postedDate,
          purchaseDate: form.purchaseDate,
        }

        if (mode === "edit" && row?.purchaseId) {
          updatePurchaseMutation.mutate({
            creditCardId: form.creditCardId,
            purchaseId: row.purchaseId,
            body,
          })
          return
        }

        createPurchaseMutation.mutate({
          creditCardId: form.creditCardId,
          body,
        })
        return
      }

      if (form.kind === "credit_card_payment") {
        if (!form.creditCardId) return

        const body = {
          amount,
          description: form.description || undefined,
          fromAccountId: form.fromAccountId,
          paymentDate: form.purchaseDate,
          postedDate: form.postedDate,
        }

        if (mode === "edit" && row?.paymentId) {
          updatePaymentMutation.mutate({
            creditCardId: form.creditCardId,
            paymentId: row.paymentId,
            body,
          })
          return
        }

        createPaymentMutation.mutate({
          creditCardId: form.creditCardId,
          body,
        })
        return
      }

      if (form.kind === "transfer") {
        const body = {
          description: form.description,
          fromAccountId: form.fromAccountId,
          fromAmount: amount || undefined,
          includeInBudget: form.includeInBudget,
          postedDate: form.postedDate,
          purchaseDate: form.purchaseDate,
          tagIds: form.tagIds,
          toAccountId: form.toAccountId,
          toAmount: toAmount || undefined,
        }

        if (mode === "edit" && row) {
          updateTransactionMutation.mutate({ id: row.id, body })
          return
        }

        createTransactionMutation.mutate({
          type: "transfer",
          ...body,
        })
        return
      }

      const body = {
        accountId: form.accountId,
        amount,
        categoryId: form.categoryId,
        currencyCode: selectedCurrencyCode,
        description: form.description,
        includeInBudget: form.includeInBudget,
        merchantId,
        paymentMethodCode: form.paymentMethodCode,
        postedDate: form.postedDate,
        purchaseDate: form.purchaseDate,
        tagIds: form.tagIds,
      }

      if (mode === "edit" && row) {
        updateTransactionMutation.mutate({ id: row.id, body })
        return
      }

      createTransactionMutation.mutate({
        type: form.kind,
        ...body,
      })
    },
    [
      createPaymentMutation,
      createPurchaseMutation,
      createTransactionMutation,
      form,
      mode,
      row,
      selectedCurrencyCode,
      updatePaymentMutation,
      updatePurchaseMutation,
      updateTransactionMutation,
    ],
  )

  const deleteCurrent = React.useCallback(() => {
    if (
      !row ||
      !window.confirm("Delete this transaction? This cannot be undone.")
    ) {
      return
    }

    if (
      row.rowKind === "credit_card_installment" &&
      row.creditCardId &&
      row.purchaseId
    ) {
      deletePurchaseMutation.mutate({
        creditCardId: row.creditCardId,
        purchaseId: row.purchaseId,
      })
      return
    }

    if (
      row.rowKind === "credit_card_payment" &&
      row.creditCardId &&
      row.paymentId
    ) {
      deletePaymentMutation.mutate({
        creditCardId: row.creditCardId,
        paymentId: row.paymentId,
      })
      return
    }

    deleteTransactionMutation.mutate(row.id)
  }, [
    deletePaymentMutation,
    deletePurchaseMutation,
    deleteTransactionMutation,
    row,
  ])

  const title =
    mode === "create"
      ? "New transaction"
      : mode === "edit"
        ? "Edit transaction"
        : "Transaction details"
  const description =
    form.kind === "transfer"
      ? "Move money between accounts with a source and destination layout."
      : form.kind === "credit_card_purchase"
        ? "Credit card purchases update the whole purchase and installment schedule."
        : form.kind === "credit_card_payment"
          ? "Credit card payments use the dedicated payment endpoint."
          : "Manage income and expense details from one place."

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className="sm:max-w-2xl"
    >
      {mode === "view" && row ? (
        <div className="space-y-5">
          <div className="rounded-[1.5rem] border border-border/70 bg-background/35 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">{row.description}</p>
                <p className="mt-1 text-muted-foreground">
                  {row.accountName}
                  {row.toAccountName ? ` -> ${row.toAccountName}` : null}
                </p>
              </div>
              <MoneyValue
                amount={row.amount}
                currencyCode={row.currencyCode}
                language={language}
                className="text-lg"
              />
            </div>
          </div>
          <FieldGroup title="Overview">
            <FieldRow
              label="Type"
              value={row.originType.replaceAll("_", " ")}
            />
            <FieldRow label="Purchase date" value={row.purchaseDate} />
            <FieldRow label="Posted date" value={row.postedDate} />
            <FieldRow
              label="Include in budget"
              value={row.includeInBudget ? "Yes" : "No"}
            />
            {row.installmentNumber && row.installmentCount ? (
              <FieldRow
                label="Installment"
                value={`${row.installmentNumber} of ${row.installmentCount}`}
              />
            ) : null}
          </FieldGroup>
          <FieldGroup title="Details">
            <FieldRow label="Category" value={viewCategoryName ?? "None"} />
            <FieldRow label="Merchant" value={viewMerchantName ?? "None"} />
            <FieldRow
              label="Payment method"
              value={row.paymentMethodName ?? "None"}
            />
            <FieldRow
              label="Tags"
              value={
                row.tags.length
                  ? row.tags.map((tag) => tag.name).join(", ")
                  : "None"
              }
            />
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onModeChange("edit")}>
              <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={deleteCurrent}
              disabled={isMutating}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={submit}>
          <FieldGroup title="Kind">
            <SelectField
              label="Transaction kind"
              value={form.kind}
              onChange={(value) =>
                patchForm({ kind: value as TransactionFormKind })
              }
              options={[
                { label: "Expense", value: "expense" },
                { label: "Income", value: "income" },
                { label: "Transfer", value: "transfer" },
                {
                  label: "Credit card purchase",
                  value: "credit_card_purchase",
                },
                { label: "Credit card payment", value: "credit_card_payment" },
              ]}
            />
          </FieldGroup>

          <FieldGroup title="Overview">
            <TextField
              label="Description"
              value={form.description}
              onChange={(description) => patchForm({ description })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label={form.kind === "transfer" ? "From amount" : "Amount"}
                type="number"
                value={form.amount}
                onChange={(amount) => patchForm({ amount })}
              />
              {form.kind === "transfer" ? (
                <TextField
                  label="To amount"
                  type="number"
                  value={form.toAmount}
                  onChange={(toAmount) => patchForm({ toAmount })}
                />
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label={
                  form.kind === "credit_card_payment"
                    ? "Payment date"
                    : "Purchase date"
                }
                type="date"
                value={form.purchaseDate}
                onChange={(purchaseDate) => patchForm({ purchaseDate })}
              />
              <TextField
                label="Posted date"
                type="date"
                value={form.postedDate}
                onChange={(postedDate) => patchForm({ postedDate })}
              />
            </div>
          </FieldGroup>

          {form.kind === "transfer" ? (
            <FieldGroup title="Transfer">
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="From account"
                  value={form.fromAccountId}
                  onChange={(fromAccountId) => patchForm({ fromAccountId })}
                  options={accountOptions}
                />
                <SelectField
                  label="To account"
                  value={form.toAccountId}
                  onChange={(toAccountId) => patchForm({ toAccountId })}
                  options={accountOptions}
                />
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-sky-400/20 bg-sky-400/10 p-3 text-sky-100">
                <HugeiconsIcon
                  icon={Exchange01Icon}
                  strokeWidth={2}
                  className="size-4"
                />
                <p>
                  Same-currency transfers mirror amounts. Cross-currency
                  transfers can send one amount and let the API resolve the
                  other through FX.
                </p>
              </div>
            </FieldGroup>
          ) : form.kind === "credit_card_purchase" ? (
            <FieldGroup title="Credit card purchase">
              <SelectField
                label="Credit card"
                value={form.creditCardId}
                onChange={(creditCardId) => patchForm({ creditCardId })}
                options={creditCardOptions}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Category"
                  value={form.categoryId}
                  onChange={(categoryId) => patchForm({ categoryId })}
                  options={categoryOptions}
                />
                <SelectField
                  label="Merchant"
                  value={form.merchantId || "none"}
                  onChange={(merchantId) => patchForm({ merchantId })}
                  options={merchantOptions}
                />
              </div>
              <TextField
                label="Installments"
                type="number"
                value={form.installmentCount}
                onChange={(installmentCount) => patchForm({ installmentCount })}
              />
              {mode === "edit" ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-amber-100">
                  <HugeiconsIcon
                    icon={CreditCardIcon}
                    strokeWidth={2}
                    className="size-4"
                  />
                  <p>
                    Editing an installment updates the parent purchase and all
                    installments.
                  </p>
                </div>
              ) : null}
            </FieldGroup>
          ) : form.kind === "credit_card_payment" ? (
            <FieldGroup title="Credit card payment">
              <SelectField
                label="Credit card"
                value={form.creditCardId}
                onChange={(creditCardId) => patchForm({ creditCardId })}
                options={creditCardOptions}
              />
              <SelectField
                label="Source account"
                value={form.fromAccountId}
                onChange={(fromAccountId) => patchForm({ fromAccountId })}
                options={accountOptions}
              />
            </FieldGroup>
          ) : (
            <FieldGroup title="Details">
              <SelectField
                label="Account"
                value={form.accountId}
                onChange={(accountId) => patchForm({ accountId })}
                options={accountOptions}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Category"
                  value={form.categoryId}
                  onChange={(categoryId) => patchForm({ categoryId })}
                  options={categoryOptions}
                />
                <SelectField
                  label="Merchant"
                  value={form.merchantId || "none"}
                  onChange={(merchantId) => patchForm({ merchantId })}
                  options={merchantOptions}
                />
              </div>
              <SelectField
                label="Payment method"
                value={form.paymentMethodCode}
                onChange={(paymentMethodCode) =>
                  patchForm({ paymentMethodCode })
                }
                options={paymentMethodOptions}
              />
            </FieldGroup>
          )}

          {form.kind !== "credit_card_purchase" &&
          form.kind !== "credit_card_payment" ? (
            <FieldGroup title="Settings">
              <TagPicker
                selectedIds={form.tagIds}
                lookups={lookups}
                onChange={(tagIds) => patchForm({ tagIds })}
              />
              <Button
                type="button"
                variant={form.includeInBudget ? "default" : "outline"}
                className="rounded-full"
                onClick={() =>
                  patchForm({ includeInBudget: !form.includeInBudget })
                }
              >
                <HugeiconsIcon icon={SaveMoneyDollarIcon} strokeWidth={2} />
                {form.includeInBudget
                  ? "Included in budget"
                  : "Excluded from budget"}
              </Button>
            </FieldGroup>
          ) : null}

          <FieldGroup title="Notes">
            <Textarea
              value={form.description}
              onChange={(event) =>
                patchForm({ description: event.target.value })
              }
              className="min-h-24 rounded-xl bg-background/45"
              placeholder="Add notes or context for this transaction..."
            />
          </FieldGroup>

          <Separator />
          <div className="flex flex-wrap justify-between gap-2">
            {mode === "edit" && row ? (
              <Button
                type="button"
                variant="destructive"
                onClick={deleteCurrent}
                disabled={isMutating}
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              {mode === "edit" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onModeChange("view")}
                >
                  Cancel
                </Button>
              ) : null}
              <Button type="submit" disabled={isMutating}>
                {isMutating ? "Saving..." : "Save transaction"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </FormSheet>
  )
}
