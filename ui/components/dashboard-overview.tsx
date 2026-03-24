"use client"

import { useTransactionsQuery } from "@/queries/use-transactions.query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DashboardOverview() {
  const { data = [] } = useTransactionsQuery()

  const income = data.filter((tx) => tx.type === "income").length
  const expenses = data.filter((tx) => tx.type === "expense" || tx.type === "card_purchase").length
  const transfers = data.filter((tx) => tx.type === "transfer").length

  const cards = [
    { label: "Income Tx", value: income.toString() },
    { label: "Expense Tx", value: expenses.toString() },
    { label: "Transfer Tx", value: transfers.toString() },
    {
      label: "Total Transactions",
      value: data.length.toString(),
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
