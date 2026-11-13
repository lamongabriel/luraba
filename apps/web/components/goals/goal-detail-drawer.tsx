"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { Goal, GoalDetail } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import Link from "next/link";

import { ProgressRing } from "@/components/charts";
import { AmountDisplay } from "@/components/display";
import { ErrorState } from "@/components/error-state";
import {
  SidePanel,
  SidePanelBody,
  SidePanelContent,
  SidePanelDescription,
  SidePanelHeader,
  SidePanelTitle,
} from "@/components/side-panel/side-panel";
import { LoadingRegion } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GOAL_PACE_DISPLAY, type GoalPace } from "@/lib/goal-pace";
import { formatMonths, GOAL_KIND_ICON } from "@/lib/goals";
import { cn } from "@/lib/utils";
import { useGoalQuery } from "@/queries/goals/use-goals-queries";
import type { GoalAction } from "./goal-card";
import { GoalProgressChart } from "./goal-progress-chart";

const CONTRIBUTIONS_SHOWN = 5;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{children}</span>
    </div>
  );
}

/** One plain sentence about the pace, from the pace helper and the goal. */
function paceSentence(goal: Goal, pace: GoalPace, language: string): string | null {
  if (pace.status === "achieved") return "You've reached this goal.";
  if (pace.status === "none") return null;
  const days = pace.daysDifference;
  const when =
    days !== null && pace.projectedDate
      ? days >= 0
        ? ` At this rate you'd finish ${days === 0 ? "right on time" : `${Math.round(days / 7) || 1} week${Math.round(days / 7) > 1 ? "s" : ""} early`}.`
        : ` At this rate you'd finish ${formatShortDate(pace.projectedDate, language)}.`
      : "";
  if (pace.status === "on_pace") return `Right on a steady pace.${when}`;
  return `${pace.status === "ahead" ? "Ahead of" : "Behind"} a steady pace to ${goal.targetDate ? formatShortDate(goal.targetDate, language) : "your plan"}.${when}`;
}

/**
 * The goal's detail in a drawer (bottom drawer on mobile): a ring, the saved amount, the pace, the plan in a few
 * rows, the progress chart and the latest contributions. The flows (add money, edit, ...) are buttons here too;
 * editing past contributions stays on the full page (`/goals/[id]`).
 */
export function GoalDetailDrawer({
  goal,
  pace,
  language,
  canUpdate,
  onOpenChange,
  onAction,
}: {
  goal: Goal | null;
  pace: GoalPace | null;
  language: string;
  canUpdate: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (action: GoalAction, goal: Goal) => void;
}) {
  const query = useGoalQuery(goal?.id ?? "", { enabled: Boolean(goal) });
  const detail: GoalDetail | undefined = query.data;
  const money = { currencyCode: goal?.currencyCode ?? "", language };
  const sentence = goal && pace ? paceSentence(goal, pace, language) : null;
  const paceDisplay = pace && pace.status !== "none" ? GOAL_PACE_DISPLAY[pace.status] : null;

  return (
    <SidePanel open={goal !== null} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader>
          <SidePanelTitle>{goal?.name ?? "Goal"}</SidePanelTitle>
          <SidePanelDescription>
            {goal?.targetDate
              ? `Target ${formatShortDate(goal.targetDate, language)}`
              : goal?.monthlyContribution
                ? "Monthly plan"
                : "No target date"}
          </SidePanelDescription>
        </SidePanelHeader>
        {goal && pace ? (
          <SidePanelBody>
            <div className="flex items-center gap-4">
              <ProgressRing
                percent={goal.estimate.percent}
                tone={pace.status === "behind" ? "negative" : "positive"}
                size={72}
                label={`${goal.estimate.percent}% saved`}
              >
                <HugeiconsIcon
                  icon={GOAL_KIND_ICON[goal.kind]}
                  strokeWidth={2}
                  className="size-5"
                />
              </ProgressRing>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <AmountDisplay
                    amount={goal.saved}
                    {...money}
                    size="lg"
                    className="text-2xl font-semibold tabular-nums"
                  />
                  <span className="text-sm text-muted-foreground">
                    of <AmountDisplay amount={goal.targetAmount} {...money} />
                  </span>
                </div>
                {paceDisplay ? (
                  <p className={cn("text-sm font-medium", paceDisplay.className)}>
                    {paceDisplay.label}
                  </p>
                ) : null}
              </div>
            </div>
            {sentence ? <p className="text-sm text-muted-foreground">{sentence}</p> : null}

            <div className="divide-y divide-border/60">
              <Row label="Remaining">
                <AmountDisplay amount={goal.estimate.remaining} {...money} showSign={false} />
              </Row>
              {goal.estimate.requiredMonthly !== null ? (
                <Row label="Needed per month">
                  <AmountDisplay
                    amount={goal.estimate.requiredMonthly}
                    {...money}
                    showSign={false}
                  />
                </Row>
              ) : null}
              {goal.monthlyContribution ? (
                <Row label="Planned per month">
                  <AmountDisplay amount={goal.monthlyContribution} {...money} showSign={false} />
                </Row>
              ) : null}
              {goal.estimate.monthsLeft !== null ? (
                <Row label="Time left">{formatMonths(goal.estimate.monthsLeft)}</Row>
              ) : null}
              {goal.estimate.projectedCompletionDate ? (
                <Row label="Finish date">
                  {formatShortDate(goal.estimate.projectedCompletionDate, language)}
                </Row>
              ) : null}
            </div>

            {canUpdate ? (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => onAction("add", goal)}>Add money</Button>
                <Button variant="outline" onClick={() => onAction("withdraw", goal)}>
                  Withdraw
                </Button>
                <Button variant="outline" onClick={() => onAction("link", goal)}>
                  Link transaction
                </Button>
                <Button variant="outline" onClick={() => onAction("edit", goal)}>
                  Edit
                </Button>
              </div>
            ) : null}

            {query.isPending ? (
              <LoadingRegion label="Loading history" className="space-y-3">
                <Skeleton className="h-40 w-full" />
              </LoadingRegion>
            ) : query.isError || !detail ? (
              <ErrorState
                title="Couldn't load the history"
                description={query.error?.message}
                onRetry={() => void query.refetch()}
              />
            ) : (
              <>
                <GoalProgressChart
                  timeline={detail.timeline}
                  targetAmount={detail.targetAmount}
                  currencyCode={detail.currencyCode}
                  language={language}
                />
                {detail.contributions.length > 0 ? (
                  <div>
                    <h3 className="mb-1 text-sm font-medium">Latest contributions</h3>
                    <ul className="divide-y divide-border/60">
                      {detail.contributions.slice(0, CONTRIBUTIONS_SHOWN).map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm">
                              {formatShortDate(item.contributedOn, language)}
                            </p>
                            {item.note || item.transaction ? (
                              <p className="truncate text-xs text-muted-foreground">
                                {item.transaction ? item.transaction.description : item.note}
                              </p>
                            ) : null}
                          </div>
                          <AmountDisplay
                            amount={item.amount}
                            kind={item.kind === "move" ? "neutral" : "auto"}
                            {...money}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <Button asChild variant="link" className="px-0">
                  <Link href={`/goals/${goal.id}`}>All contributions and details</Link>
                </Button>
              </>
            )}
          </SidePanelBody>
        ) : null}
      </SidePanelContent>
    </SidePanel>
  );
}
