"use client"

import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { CreditCard } from "@luraba/contracts"
import Link from "next/link"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { MoneyValue } from "@/components/finance/money-value"
import { TransactionTypeBadge } from "@/components/tables/transactions/transaction-type-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Typography } from "@/components/ui/typography"
import { formatDate } from "@/lib/format"
import { useTransactionsQuery } from "@/queries/transactions/use-transactions-query"

export function CreditCardActivity({
  card,
  language,
  precision,
}: {
  card: CreditCard
  language: string
  precision: number
}) {
  const query = useTransactionsQuery({
    creditCardIds: [card.id],
    page: 1,
    perPage: 5,
    sort: "postedDate",
    sortDirection: "desc",
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle>Recent activity</CardTitle>
        <Button asChild variant="link" size="sm">
          <Link
            href={`/transactions?creditCardIds=${encodeURIComponent(card.id)}`}
          >
            View all
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <div
            className="space-y-3"
            aria-busy="true"
            aria-label="Loading card activity"
            role="status"
          >
            {["one", "two", "three", "four"].map((key) => (
              <Skeleton key={key} className="h-8" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            title="Couldn’t load activity"
            description={query.error.message}
            onRetry={() => void query.refetch()}
          />
        ) : query.data.data.length === 0 ? (
          <EmptyState
            className="min-h-40 border-0 bg-transparent px-0 py-6"
            title="No card activity yet"
            description="Purchases and payments for this card will appear here."
          />
        ) : (
          <div className="divide-y divide-border/70">
            {query.data.data.map((row) => (
              <div
                key={row.rowId}
                className="flex min-w-0 items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <Typography variant="small-strong" className="truncate">
                    {row.description}
                  </Typography>
                  <div className="mt-1 flex items-center gap-2">
                    <TransactionTypeBadge type={row.originType} />
                    <Typography variant="small-muted">
                      {formatDate(row.postedDate, {
                        formatString: "MMM d, yyyy",
                      })}
                    </Typography>
                  </div>
                </div>
                <MoneyValue
                  amount={row.amount}
                  currencyCode={row.currencyCode}
                  language={language}
                  precision={precision}
                  signed
                  className="shrink-0 text-xs"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
