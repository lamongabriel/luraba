"use client";

import { type Goal, MAX_PER_PAGE } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import Link from "next/link";
import type * as React from "react";
import { MemberDisplay } from "@/components/display";
import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { MoneyValue } from "@/components/finance/money-value";
import { GoalSheet } from "@/components/goals/goal-sheet";
import { SectionReveal } from "@/components/motion/reveal";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { useDisclosure } from "@/hooks/use-disclosure";
import { GOAL_KIND_OPTIONS, GOAL_STATE_BADGE, GOAL_STATE_LABELS } from "@/lib/goals";
import { useGoalsQuery } from "@/queries/goals/use-goals-queries";
import { useAuthSessionStore } from "@/stores/auth-session-store";

function GoalHint({ goal, language }: { goal: Goal; language: string }) {
  const { estimate } = goal;

  if (goal.state === "achieved") {
    return (
      <Typography variant="small-muted">
        {goal.achievedOn ? `Reached ${formatShortDate(goal.achievedOn, language)}` : "Reached"}
      </Typography>
    );
  }
  if (estimate.requiredMonthly !== null) {
    return (
      <Typography variant="small-muted">
        <MoneyValue
          amount={estimate.requiredMonthly}
          currencyCode={goal.currencyCode}
          language={language}
        />{" "}
        a month to finish by {formatShortDate(goal.targetDate ?? "", language)}
      </Typography>
    );
  }
  if (estimate.projectedCompletionDate) {
    return (
      <Typography variant="small-muted">
        At this pace: {formatShortDate(estimate.projectedCompletionDate, language)}
      </Typography>
    );
  }
  return <Typography variant="small-muted">No monthly plan yet</Typography>;
}

function GoalCard({ goal, language }: { goal: Goal; language: string }) {
  const kindLabel = GOAL_KIND_OPTIONS.find((option) => option.value === goal.kind)?.label;

  return (
    <Link
      href={`/goals/${goal.id}`}
      className="block rounded-xl border border-border/60 p-4 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Typography variant="small-strong" className="truncate">
            {goal.name}
          </Typography>
          <Typography variant="small-muted">{kindLabel}</Typography>
          <MemberDisplay userId={goal.createdByUserId} size="xs" className="mt-1" />
        </div>
        <Badge variant={GOAL_STATE_BADGE[goal.state]}>{GOAL_STATE_LABELS[goal.state]}</Badge>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${goal.estimate.percent}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <Typography variant="small-muted">
          <MoneyValue amount={goal.saved} currencyCode={goal.currencyCode} language={language} /> of{" "}
          <MoneyValue
            amount={goal.targetAmount}
            currencyCode={goal.currencyCode}
            language={language}
          />
        </Typography>
        <GoalHint goal={goal} language={language} />
      </div>
    </Link>
  );
}

export default function GoalsPage() {
  const sheet = useDisclosure();
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const query = useGoalsQuery({ perPage: MAX_PER_PAGE });
  const goals = query.data?.data ?? [];

  let content: React.ReactNode;

  if (query.isPending) {
    content = (
      <div className="grid gap-3 md:grid-cols-2">
        {["a", "b", "c"].map((key) => (
          <Skeleton key={key} className="h-28 rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  } else if (query.isError) {
    content = (
      <ErrorState
        title="Couldn't load goals"
        description={query.error.message || "An unexpected error occurred while loading this page."}
        onRetry={() => void query.refetch()}
      />
    );
  } else if (goals.length === 0) {
    content = (
      <div className="rounded-xl border border-dashed border-border/70 p-8 text-center">
        <Typography variant="small-strong">No goals yet</Typography>
        <Typography variant="small-muted" className="mt-1">
          Save for something, or invest a set amount each month, and see when you'll get there.
        </Typography>
      </div>
    );
  } else {
    content = (
      <SectionReveal className="grid gap-3 md:grid-cols-2">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} language={language} />
        ))}
      </SectionReveal>
    );
  }

  return (
    <InternalPageLayout
      title="Goals"
      subtitle="Save or invest toward something and see when you will get there."
      actions={
        <PermissionButton
          permission={PERMISSIONS.GOALS_CREATE}
          deniedMessage="Your household role cannot create goals."
          onClick={sheet.onOpen}
        >
          New goal
        </PermissionButton>
      }
    >
      {content}
      <GoalSheet open={sheet.isOpen} onOpenChange={sheet.setIsOpen} />
    </InternalPageLayout>
  );
}
