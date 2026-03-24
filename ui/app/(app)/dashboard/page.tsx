"use client"

import { DashboardOverview } from "@/components/dashboard-overview"
import { useAccountsQuery } from "@/queries/use-accounts.query"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardPage() {
  const { data: accounts = [] } = useAccountsQuery()

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="font-heading text-3xl">Welcome back, Gabriel</h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your finances this month.
        </p>
      </section>

      <DashboardOverview />

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Accounts Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground">{account.type}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{account.institutionName ?? "No institution"}</p>
                  <Badge variant="outline">currency #{account.currencyId}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Month Focus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Track credit card bill impact without losing visibility of full personal budget.</p>
            <p>Keep transfers and debt payments separated from regular expenses for cleaner reports.</p>
            <p>Review categories with over-budget status before month close.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
