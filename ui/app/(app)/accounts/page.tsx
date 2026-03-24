"use client"

import { useAccountsQuery } from "@/queries/use-accounts.query"
import { useFinanceUiStore } from "@/stores/finance-ui-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const ACCOUNT_TYPE_LABELS: Record<"checking" | "savings" | "cash" | "wallet", string> = {
  checking: "Checking",
  savings: "Savings",
  cash: "Cash",
  wallet: "Wallet",
}

export default function AccountsPage() {
  const { accountScope, setAccountScope } = useFinanceUiStore()
  const { data: accounts = [], isLoading, isError } = useAccountsQuery()

  const filtered =
    accountScope === "all"
      ? accounts
      : accounts.filter((account) =>
          accountScope === "assets"
            ? account.type === "checking" || account.type === "savings" || account.type === "cash"
            : account.type === "wallet"
        )

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="font-heading text-3xl">Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Track assets and debts with a clear separation.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button variant={accountScope === "all" ? "default" : "outline"} onClick={() => setAccountScope("all")}>All</Button>
        <Button variant={accountScope === "assets" ? "default" : "outline"} onClick={() => setAccountScope("assets")}>Assets</Button>
        <Button variant={accountScope === "debts" ? "default" : "outline"} onClick={() => setAccountScope("debts")}>Debts</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading accounts...</p> : null}
        {isError ? <p className="text-sm text-destructive">Failed to load accounts.</p> : null}
        {filtered.map((account) => (
          <Card key={account.id}>
            <CardHeader>
              <CardTitle className="text-base">{account.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{ACCOUNT_TYPE_LABELS[account.type]}</p>
              <p className="text-xs text-muted-foreground">
                {account.institutionName ?? "No institution"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
