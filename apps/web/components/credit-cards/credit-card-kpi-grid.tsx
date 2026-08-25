"use client"

import type { UseQueryResult } from "@tanstack/react-query"

import { ErrorState } from "@/components/error-state"
import { MoneyValue } from "@/components/finance/money-value"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Typography } from "@/components/ui/typography"
import type { CreditCard, CreditCardCycle } from "@/interfaces/credit-card"
import { formatDate } from "@/lib/format"
import type { AppClientError } from "@/services/error-client"

import {
  getCreditCardUtilization,
  getCurrentCreditCardCycle,
  getCycleAmount,
  getNextCreditCardCycle,
} from "./credit-card-overview.utils"

type CyclesQuery = UseQueryResult<{ data: CreditCardCycle[] }, AppClientError>

function Kpi({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0 border-l border-border/70 pl-3 first:border-l-0 first:pl-0">
      <Typography variant="small-muted" className="truncate">
        {label}
      </Typography>
      <div className="mt-1 truncate text-sm font-medium">{children}</div>
    </div>
  )
}

export function CreditCardKpiGrid({
  card,
  cyclesQuery,
  language,
  precision,
}: {
  card: CreditCard
  cyclesQuery: CyclesQuery
  language: string
  precision: number
}) {
  if (cyclesQuery.isPending) {
    return (
      <Card aria-busy="true" aria-label="Loading credit card summary">
        <CardContent className="grid grid-cols-2 gap-4 py-4 lg:grid-cols-5">
          {["balance", "available", "utilization", "statement", "due"].map(
            (key) => (
              <Skeleton key={key} className="h-10" />
            ),
          )}
        </CardContent>
      </Card>
    )
  }

  if (cyclesQuery.isError || !cyclesQuery.data) {
    return (
      <ErrorState
        title="Couldn’t load the card summary"
        description={
          cyclesQuery.error?.message ?? "Try again to load billing details."
        }
        onRetry={() => void cyclesQuery.refetch()}
      />
    )
  }

  const cycles = cyclesQuery.data.data
  const currentCycle = getCurrentCreditCardCycle(cycles)
  const nextCycle = getNextCreditCardCycle(cycles)
  const utilization = getCreditCardUtilization(card)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Card overview</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 pb-4 lg:grid-cols-5">
        <Kpi label="Balance owed">
          <MoneyValue
            amount={card.balance}
            currencyCode={card.currencyCode}
            language={language}
            precision={precision}
          />
        </Kpi>
        <Kpi label="Available credit">
          {card.remainingCreditAmount === null ? (
            <span className="text-muted-foreground">No limit</span>
          ) : (
            <MoneyValue
              amount={card.remainingCreditAmount}
              currencyCode={card.currencyCode}
              language={language}
              precision={precision}
            />
          )}
        </Kpi>
        <Kpi label="Utilization">
          {utilization === null ? (
            <span className="text-muted-foreground">No limit</span>
          ) : (
            `${utilization.toFixed(0)}%`
          )}
        </Kpi>
        <Kpi label="Current statement">
          {currentCycle ? (
            <MoneyValue
              amount={getCycleAmount(currentCycle)}
              currencyCode={card.currencyCode}
              language={language}
              precision={precision}
            />
          ) : (
            <span className="text-muted-foreground">No statement</span>
          )}
        </Kpi>
        <Kpi label="Next due">
          {nextCycle ? (
            <span>
              <MoneyValue
                amount={getCycleAmount(nextCycle)}
                currencyCode={card.currencyCode}
                language={language}
                precision={precision}
              />
              <Typography as="span" variant="small-muted" className="ml-1">
                {formatDate(nextCycle.dueDate, { formatString: "MMM d" })}
              </Typography>
            </span>
          ) : (
            <span className="text-muted-foreground">No due date</span>
          )}
        </Kpi>
      </CardContent>
    </Card>
  )
}
