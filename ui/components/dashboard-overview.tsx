import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { transactionFeed } from "@/lib/mock-data";

export function DashboardOverview() {
  const income = transactionFeed.filter((tx) => tx.amount > 0).length;
  const expenses = transactionFeed.filter((tx) => tx.amount < 0).length;
  const transfers = transactionFeed.filter((tx) => tx.category === "Transfer").length;
  const adjustments = transactionFeed.filter((tx) => tx.status === "Pending").length;

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
