"use client";

import type { SafeToSpend, SafeToSpendCurrency } from "@luraba/contracts";

import {
  AmountDisplay,
  CombinedAmountDisplay,
  CurrencyDisplay,
  combinedNote,
} from "@/components/display";
import { KpiCard, KpiGrid, KpiGridSkeleton } from "@/components/kpi";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { cn } from "@/lib/utils";
import { PLAN_BREAKDOWN_GRID, PLAN_BREAKDOWN_ROW, PLAN_WHAT_IF_HEIGHT } from "./plan-layout";
import { WhatIf } from "./what-if";

function BreakdownRow({
  label,
  hint,
  amount,
  currencyCode,
  precision,
  language,
  kind = "neutral",
}: {
  label: string;
  hint?: string;
  amount: number | null;
  currencyCode: string;
  precision: number;
  language: string;
  kind?: "neutral" | "expense" | "income";
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", PLAN_BREAKDOWN_ROW)}>
      <div className="min-w-0">
        <dt className="truncate text-sm">{label}</dt>
        {hint ? <dd className="m-0 truncate text-xs text-muted-foreground">{hint}</dd> : null}
      </div>
      <dd className="m-0 shrink-0 text-sm font-medium">
        {amount === null ? (
          <span className="text-muted-foreground">No plan</span>
        ) : (
          <AmountDisplay
            amount={amount}
            currencyCode={currencyCode}
            kind={amount === 0 ? "neutral" : kind}
            precision={precision}
            language={language}
          />
        )}
      </dd>
    </div>
  );
}

function sign(value: number | null) {
  return value !== null && value < 0 ? "border-destructive/40 bg-destructive/5" : undefined;
}

function CurrencyBlock({
  group,
  language,
  precision,
}: {
  group: SafeToSpendCurrency;
  language: string;
  precision: number;
}) {
  const c = group.currencyCode;
  const t = group.thisMonth;
  const n = group.nextMonth;
  const money = { currencyCode: c, precision, language };

  return (
    <div className="space-y-5">
      <CurrencyDisplay currencyCode={c} showName />
      <div className={PLAN_BREAKDOWN_GRID}>
        <dl className="divide-y divide-border/60 border-y border-border/60">
          <BreakdownRow
            {...money}
            label="In spendable accounts"
            hint={t.goalFundsHeld > 0 ? "Without the money set aside for goals" : undefined}
            amount={t.spendableBalance}
          />
          <BreakdownRow {...money} label="Unpaid bills" amount={-t.billsRemaining} kind="expense" />
          <BreakdownRow
            {...money}
            label="Goal contributions still owed"
            amount={-t.goalsOwed}
            kind="expense"
          />
          <BreakdownRow
            {...money}
            label="Card invoices due"
            amount={-t.invoicesDue}
            kind="expense"
          />
          <BreakdownRow
            {...money}
            label="Left to spend"
            amount={t.leftToSpend}
            kind={t.leftToSpend < 0 ? "expense" : "neutral"}
          />
        </dl>
        <dl className="divide-y divide-border/60 border-y border-border/60">
          <BreakdownRow
            {...money}
            label="Projected income"
            hint="Salary minus taxes from the monthly plan"
            amount={n.projectedIncome}
          />
          <BreakdownRow {...money} label="Bills due" amount={-n.bills} kind="expense" />
          <BreakdownRow {...money} label="Goal contributions" amount={-n.goals} kind="expense" />
          <BreakdownRow
            {...money}
            label="Already charged to the card"
            amount={-n.cardCharged}
            kind="expense"
          />
          <BreakdownRow
            {...money}
            label="Left for the card"
            amount={n.leftForCard}
            kind={n.leftForCard !== null && n.leftForCard < 0 ? "expense" : "neutral"}
          />
        </dl>
      </div>
      <WhatIf group={group} precision={precision} language={language} />
    </div>
  );
}

function Headline({ data, language }: { data: SafeToSpend; language: string }) {
  const { combined } = data;
  const withNote = (amount: Parameters<typeof combinedNote>[0], text: string) => {
    const note = combinedNote(amount, combined.fx, language);
    return note ? `${note} · ${text}` : text;
  };
  const value = (amount: NonNullable<SafeToSpend["combined"]["leftForCard"]>) => (
    <CombinedAmountDisplay
      combined={amount}
      fx={combined.fx}
      language={language}
      size="lg"
      kind={amount.total !== null && amount.total < 0 ? "expense" : "neutral"}
      showSign={amount.total !== null && amount.total < 0}
    />
  );
  const card = combined.leftForCard;

  return (
    <KpiGrid columns={2}>
      <KpiCard
        title="Left to spend this month"
        className={sign(combined.leftToSpend.total)}
        value={value(combined.leftToSpend)}
        secondary={withNote(
          combined.leftToSpend,
          "In cash, after bills, goals and card invoices due",
        )}
      />
      <KpiCard
        title="Left for the card next month"
        className={sign(card?.total ?? null)}
        value={card ? value(card) : <span className="text-muted-foreground">No plan</span>}
        secondary={
          card
            ? withNote(card, "Projected income minus what is already committed")
            : "Set a monthly plan to project next month"
        }
      />
    </KpiGrid>
  );
}

/**
 * The headline of the page: ONE number in the household base currency for what is left in cash this
 * month and for the card next month, then each currency's breakdown in its own currency.
 */
export function LeftToSpend({ data, language }: { data: SafeToSpend; language: string }) {
  const precisionOf = useCurrencyPrecision();
  return (
    <div className="space-y-10">
      <Headline data={data} language={language} />
      {data.currencies.map((group) => (
        <CurrencyBlock
          key={group.currencyCode}
          group={group}
          language={language}
          precision={precisionOf(group.currencyCode)}
        />
      ))}
    </div>
  );
}

/** Loading twin of one `CurrencyBlock`: same heading, cards, breakdown rows and what-if line. */
export function LeftToSpendSkeleton() {
  const rows = Array.from({ length: 5 }, (_, index) => index);
  const list = (
    <div aria-hidden="true" className="divide-y divide-border/60 border-y border-border/60">
      {rows.map((row) => (
        <div
          key={row}
          className={cn("flex items-center justify-between gap-3", PLAN_BREAKDOWN_ROW)}
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
  return (
    <div
      className="space-y-10"
      role="status"
      aria-busy="true"
      aria-label="Loading what is left to spend"
    >
      <KpiGridSkeleton columns={2} withDescription label="Loading headline figures" />
      <div className="space-y-5">
        <Skeleton className="h-5 w-32" />
        <div className={PLAN_BREAKDOWN_GRID}>
          {list}
          {list}
        </div>
        <div className={PLAN_WHAT_IF_HEIGHT}>
          <Skeleton className="h-9 w-80" />
          <Typography variant="small-muted" className="sr-only">
            Loading
          </Typography>
        </div>
      </div>
    </div>
  );
}
