"use client"

import * as React from "react"
import { Pie, PieChart, Sector } from "recharts"
import type { PieSectorShapeProps } from "recharts/types/polar/Pie"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { TransactionAnalytics } from "@/interfaces/transaction"
import { formatCurrency } from "@/lib/finance"
import { CURATED_COLOR_PRESETS } from "@/lib/icons"

export function ExpenseBreakdownPanel({
  analytics,
  language = "en",
  precision = 2,
}: {
  analytics: TransactionAnalytics
  language?: string
  precision?: number
}) {
  const items = analytics.expenseBreakdown.items
  const [activeIndex, setActiveIndex] = React.useState(0)
  const chartItems = items.map((item, index) => ({
    ...item,
    fill:
      item.color ?? CURATED_COLOR_PRESETS[index % CURATED_COLOR_PRESETS.length],
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {chartItems.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No expenses in this period.
          </p>
        ) : (
          <>
            <ChartContainer
              config={{
                amount: { label: "Amount", color: "var(--color-primary)" },
              }}
              className="mx-auto h-36 w-full max-w-48"
            >
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={chartItems}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius={38}
                  outerRadius={58}
                  strokeWidth={2}
                  stroke="var(--color-card)"
                  shape={({
                    index,
                    outerRadius = 0,
                    ...props
                  }: PieSectorShapeProps) =>
                    index === activeIndex ? (
                      <Sector {...props} outerRadius={outerRadius + 6} />
                    ) : (
                      <Sector {...props} outerRadius={outerRadius} />
                    )
                  }
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(0)}
                  isAnimationActive={false}
                />
              </PieChart>
            </ChartContainer>
            <ul className="space-y-2" aria-label="Expense categories">
              {chartItems.map((item) => (
                <li
                  key={item.id ?? "uncategorized"}
                  className="flex items-center gap-2"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.fill }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {item.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(
                      item.amount,
                      analytics.currencyCode,
                      language,
                      undefined,
                      precision,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
