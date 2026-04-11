"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { useTransactionsQuery } from "@/queries/use-transactions.query";

export function DashboardOverview() {
  const { data = [] } = useTransactionsQuery();

  const income = data.filter((tx) => tx.type === "income").length;
  const expenses = data.filter((tx) => tx.type === "expense").length;
  const transfers = data.filter((tx) => tx.type === "transfer").length;
  const adjustments = data.filter((tx) => tx.type === "adjustment").length;

  const cards = [
    { label: "Income Tx", value: income.toString() },
    { label: "Expense Tx", value: expenses.toString() },
    { label: "Transfer Tx", value: transfers.toString() },
    {
      label: "Adjustments",
      value: adjustments.toString(),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader>
            <Typography as="h3" variant="body-muted" className="font-medium">
              {card.label}
            </Typography>
          </CardHeader>
          <CardContent>
            <Typography variant="metric">{card.value}</Typography>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
