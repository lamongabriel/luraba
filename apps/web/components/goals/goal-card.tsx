"use client";

import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Goal } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";

import { ProgressRing } from "@/components/charts";
import { AmountDisplay } from "@/components/display";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GOAL_PACE_DISPLAY, type GoalPace } from "@/lib/goal-pace";
import { GOAL_KIND_ICON, GOAL_KIND_OPTIONS } from "@/lib/goals";
import { cn } from "@/lib/utils";
import { GOAL_CARD_HEIGHT } from "./goal-layout";

export type GoalAction = "add" | "withdraw" | "link" | "edit" | "open" | "delete";

const RING_TONE = {
  ahead: "positive",
  on_pace: "positive",
  achieved: "positive",
  behind: "negative",
  none: "neutral",
} as const;

/**
 * One goal as a compact card: a ring with the goal's glyph, name and target date, saved of the target, a
 * progress bar with a marker where a steady pace would be, what is left and the pace. The card opens the
 * detail drawer; the menu has the flows (add money, withdraw, link a transaction, edit, delete).
 */
export function GoalCard({
  goal,
  pace,
  language,
  canUpdate,
  canDelete,
  onOpen,
  onAction,
}: {
  goal: Goal;
  pace: GoalPace;
  language: string;
  canUpdate: boolean;
  canDelete: boolean;
  onOpen: (goal: Goal) => void;
  onAction: (action: GoalAction, goal: Goal) => void;
}) {
  const percent = goal.estimate.percent;
  const money = { currencyCode: goal.currencyCode, language };
  const kindLabel = GOAL_KIND_OPTIONS.find((option) => option.value === goal.kind)?.label;
  const paceDisplay = pace.status === "none" ? null : GOAL_PACE_DISPLAY[pace.status];
  const inactive = goal.state === "paused" || goal.state === "canceled";

  return (
    <li
      className={cn(
        "relative flex flex-col justify-between rounded-xl border border-border/60 bg-card p-4 transition-colors hover:bg-muted/40",
        inactive && "opacity-70",
        GOAL_CARD_HEIGHT,
      )}
    >
      <button
        type="button"
        aria-label={`Open ${goal.name}`}
        className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        onClick={() => onOpen(goal)}
      />

      <div className="pointer-events-none relative flex items-center gap-3">
        <ProgressRing
          percent={percent}
          tone={RING_TONE[pace.status]}
          size={44}
          label={`${goal.name}: ${percent}% saved`}
        >
          <HugeiconsIcon icon={GOAL_KIND_ICON[goal.kind]} strokeWidth={2} className="size-4" />
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{goal.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {inactive
              ? goal.state === "paused"
                ? "Paused"
                : "Canceled"
              : goal.targetDate
                ? `by ${formatShortDate(goal.targetDate, language)}`
                : kindLabel}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`${goal.name} actions`}
              className="pointer-events-auto relative -mr-1.5"
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {canUpdate ? (
              <>
                <DropdownMenuItem onSelect={() => onAction("add", goal)}>
                  Add money
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAction("withdraw", goal)}>
                  Withdraw
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAction("link", goal)}>
                  Link a transaction
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAction("edit", goal)}>
                  Edit goal
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuItem onSelect={() => onAction("open", goal)}>
              Full details
            </DropdownMenuItem>
            {canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => onAction("delete", goal)}>
                  Delete goal
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="pointer-events-none relative flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <AmountDisplay
            amount={goal.saved}
            {...money}
            size="lg"
            className="font-semibold tabular-nums"
          />
          <span className="truncate text-sm text-muted-foreground">
            of <AmountDisplay amount={goal.targetAmount} {...money} className="tabular-nums" />
          </span>
        </div>
        <span className="text-sm font-medium tabular-nums">{percent}%</span>
      </div>

      <div className="pointer-events-none relative space-y-1.5">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={`${goal.name} progress`}
          className="relative h-2 rounded-full bg-muted"
        >
          <div
            className={cn(
              "h-full rounded-full",
              pace.status === "behind" ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${percent}%` }}
          />
          {pace.expectedPercent !== null && pace.status !== "achieved" ? (
            <span
              aria-hidden="true"
              title="Where a steady pace would be"
              className="absolute -top-0.5 h-3 w-0.5 rounded-full bg-foreground/60"
              style={{ left: `${pace.expectedPercent}%` }}
            />
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            {goal.estimate.remaining > 0 ? (
              <>
                <AmountDisplay
                  amount={goal.estimate.remaining}
                  {...money}
                  size="xs"
                  showSign={false}
                />{" "}
                to go
              </>
            ) : (
              "Target reached"
            )}
          </span>
          {paceDisplay ? (
            <span className={cn("font-medium", paceDisplay.className)}>{paceDisplay.label}</span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
