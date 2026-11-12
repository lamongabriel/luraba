"use client";

import type { Goal, SafeToSpend } from "@luraba/contracts";
import Link from "next/link";

import { AccountDisplay, AmountDisplay } from "@/components/display";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { GOAL_KIND_OPTIONS, GOAL_STATE_BADGE, GOAL_STATE_LABELS } from "@/lib/goals";
import { contributionPercent } from "@/lib/plan";
import { cn } from "@/lib/utils";
import { PLAN_GOAL_ROW } from "./plan-layout";

type AccountLike = Parameters<typeof AccountDisplay>[0]["account"];

interface PlanGoalsProps {
  goals: Goal[];
  plan: SafeToSpend;
  accounts: NonNullable<AccountLike>[] | undefined;
  precisionOf: (currencyCode: string) => number;
  language: string;
}

/**
 * Goals on the Budgets & goals page, one list row each (never a table): this month's contribution
 * against its plan, progress toward the target and where the money sits.
 */
export function PlanGoals({ goals, plan, accounts, precisionOf, language }: PlanGoalsProps) {
  const thisMonth = new Map(
    plan.currencies.flatMap((group) => group.goals).map((goal) => [goal.goalId, goal]),
  );
  const byId = new Map((accounts ?? []).map((account) => [account.id, account]));

  return (
    <ul className="divide-y divide-border/60 border-y border-border/60">
      {goals.map((goal) => {
        const month = thisMonth.get(goal.id);
        const precision = precisionOf(goal.currencyCode);
        const money = { currencyCode: goal.currencyCode, precision, language };
        const kind = GOAL_KIND_OPTIONS.find((option) => option.value === goal.kind)?.label;
        const percent = month ? contributionPercent(month.planned, month.contributed) : 0;
        const places = goal.locations.filter((location) => location.amount !== 0);

        return (
          <li key={goal.id} className={cn("flex flex-col justify-center gap-1.5", PLAN_GOAL_ROW)}>
            <div className="flex items-center justify-between gap-3">
              <Link
                href={`/goals/${goal.id}`}
                className="min-w-0 truncate text-sm font-medium hover:underline"
              >
                {goal.name}
                <span className="ml-2 text-xs font-normal text-muted-foreground">{kind}</span>
              </Link>
              <Badge variant={GOAL_STATE_BADGE[goal.state]}>{GOAL_STATE_LABELS[goal.state]}</Badge>
            </div>
            {month && month.planned > 0 ? (
              <div className="flex items-center gap-3">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${goal.name} this month`}
                >
                  <div
                    className={cn(
                      "h-full rounded-full",
                      percent >= 100 ? "bg-emerald-500" : "bg-primary",
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  <AmountDisplay {...money} amount={month.contributed} size="xs" /> of{" "}
                  <AmountDisplay {...money} amount={month.planned} size="xs" /> this month
                </span>
              </div>
            ) : (
              <Typography variant="small-muted">Nothing planned this month</Typography>
            )}
            <div className="flex min-w-0 items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="min-w-0 truncate">
                <AmountDisplay {...money} amount={goal.saved} size="xs" /> saved of{" "}
                <AmountDisplay {...money} amount={goal.targetAmount} size="xs" /> (
                {goal.estimate.percent}%)
              </span>
              <span className="flex min-w-0 shrink items-center gap-2 overflow-hidden">
                {places.length === 0 ? (
                  <span>Not placed yet</span>
                ) : (
                  places
                    .slice(0, 2)
                    .map((location) => (
                      <AccountDisplay
                        key={location.accountId ?? "none"}
                        account={location.accountId ? byId.get(location.accountId) : null}
                        emptyLabel="No account"
                        size="xs"
                      />
                    ))
                )}
                {places.length > 2 ? <span>+{places.length - 2}</span> : null}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Loading twin of `PlanGoals`: the same hairlined rows at the same height. */
export function PlanGoalsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading goals"
      className="divide-y divide-border/60 border-y border-border/60"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          key={index}
          className={cn("flex flex-col justify-center gap-1.5", PLAN_GOAL_ROW)}
        >
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-64" />
        </div>
      ))}
    </div>
  );
}
