"use client"

import { format } from "date-fns"
import * as React from "react"

import { FormSheet } from "@/components/forms/form-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Typography } from "@/components/ui/typography"
import type { AccountDetails } from "@/interfaces/account"
import { majorToMinorUnits, minorToMajorUnits } from "@/lib/finance"
import { queryClient } from "@/lib/query-client"
import { useCreateTransactionMutation } from "@/mutations/transactions/use-transaction-mutations"
import { accountQueryKeys } from "@/queries/accounts/use-accounts-query"
import { useCurrenciesQuery } from "@/queries/currencies/use-currencies-query"
import { transactionQueryKeys } from "@/queries/transactions/use-transactions-query"

export function AdjustAccountBalanceSheet({
  account,
  open,
  onOpenChange,
}: {
  account: AccountDetails
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const currencies = useCurrenciesQuery()
  const precision =
    currencies.data?.data.find((item) => item.code === account.currencyCode)
      ?.precision ?? 2
  const [balance, setBalance] = React.useState(
    String(minorToMajorUnits(account.balance, precision)),
  )
  const [date, setDate] = React.useState(format(new Date(), "yyyy-MM-dd"))
  const mutation = useCreateTransactionMutation({
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: accountQueryKeys.detail(account.id),
        }),
        queryClient.invalidateQueries({
          queryKey: accountQueryKeys.transactions(account.id),
        }),
        queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
      ])
      onOpenChange(false)
    },
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const nextBalance = Number(balance)
    if (!Number.isFinite(nextBalance)) return

    mutation.mutate({
      type: "adjustment",
      accountId: account.id,
      balance: majorToMinorUnits(nextBalance, precision),
      description: "Balance adjustment",
      purchaseDate: date,
      postedDate: date,
      includeInBudget: false,
    })
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Adjust balance"
      description="Set the account balance as of a specific date. This creates an auditable adjustment transaction."
      className="border-l-0 shadow-none before:hidden"
    >
      <form className="space-y-5" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="adjusted-balance">New balance</Label>
          <Input
            id="adjusted-balance"
            type="number"
            step={1 / 10 ** precision}
            value={balance}
            onChange={(event) => setBalance(event.target.value)}
            className="h-7 rounded-xl shadow-none"
            disabled={mutation.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="balance-date">Balance as of</Label>
          <Input
            id="balance-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-7 rounded-xl shadow-none"
            disabled={mutation.isPending}
          />
        </div>
        {mutation.errorMessage ? (
          <Typography variant="small-destructive">
            {mutation.errorMessage}
          </Typography>
        ) : null}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={mutation.isPending}
            loadingText="Adjusting..."
          >
            Save adjustment
          </Button>
        </div>
      </form>
    </FormSheet>
  )
}
