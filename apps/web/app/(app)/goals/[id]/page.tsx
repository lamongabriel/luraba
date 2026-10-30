"use client";

import { Delete02Icon, MoreHorizontalIcon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { GoalContribution, GoalDetail } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { MoneyValue } from "@/components/finance/money-value";
import { ContributionModal } from "@/components/goals/contribution-modal";
import { GoalProgressChart } from "@/components/goals/goal-progress-chart";
import { GoalSheet } from "@/components/goals/goal-sheet";
import { LinkGoalTransactionModal } from "@/components/goals/link-transaction-modal";
import { PERMISSIONS, useCan } from "@/components/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { formatCurrency } from "@/lib/finance";
import {
  bpsToPercent,
  formatMonths,
  GOAL_KIND_OPTIONS,
  GOAL_STATE_BADGE,
  GOAL_STATE_LABELS,
} from "@/lib/goals";
import {
  useDeleteGoalMutation,
  useRemoveContributionMutation,
} from "@/mutations/goals/use-goal-mutations";
import { useGoalQuery } from "@/queries/goals/use-goals-queries";
import { useAuthSessionStore } from "@/stores/auth-session-store";

function Stat({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <Typography variant="small-muted">{label}</Typography>
      <div className="mt-1 text-lg">{children}</div>
      {hint ? (
        <Typography variant="small-muted" className="mt-1">
          {hint}
        </Typography>
      ) : null}
    </div>
  );
}

/** One plain sentence on where the goal stands, from the estimate. */
function describeOutlook(goal: GoalDetail, language: string): string {
  const { estimate } = goal;
  if (goal.state === "achieved") return "You've reached this goal.";
  if (goal.state === "paused" || goal.state === "canceled") return `This goal is ${goal.state}.`;
  if (goal.monthlyContribution && estimate.projectedCompletionDate) {
    return `Putting in the planned amount each month, you'll reach it on ${formatShortDate(estimate.projectedCompletionDate, language)}.`;
  }
  if (goal.targetDate && estimate.requiredMonthly !== null) {
    return estimate.onTrack
      ? `You're ahead of a steady pace to ${formatShortDate(goal.targetDate, language)}.`
      : `Put in about this much each month to reach it by ${formatShortDate(goal.targetDate, language)}.`;
  }
  return "Add a monthly amount or a target date to get an estimate.";
}

function ContributionRow({
  contribution,
  currencyCode,
  language,
  canUpdate,
  onEdit,
  onRemove,
  busy,
}: {
  contribution: GoalContribution;
  currencyCode: string;
  language: string;
  canUpdate: boolean;
  onEdit: (contribution: GoalContribution) => void;
  onRemove: (contribution: GoalContribution) => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <Typography variant="small-strong">
          {formatShortDate(contribution.contributedOn, language)}
        </Typography>
        {contribution.transaction ? (
          <Typography variant="small-muted" className="truncate">
            From “{contribution.transaction.description}”
          </Typography>
        ) : contribution.note ? (
          <Typography variant="small-muted" className="truncate">
            {contribution.note}
          </Typography>
        ) : null}
      </div>
      <MoneyValue
        amount={contribution.amount}
        currencyCode={currencyCode}
        language={language}
        signed
        className="shrink-0 text-sm"
      />
      {canUpdate ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" disabled={busy}>
              <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
              <span className="sr-only">Contribution actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => onEdit(contribution)}>Edit</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => onRemove(contribution)}>
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

export default function GoalDetailsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const router = useRouter();
  const can = useCan();
  const canUpdate = can(PERMISSIONS.GOALS_UPDATE);
  const canDelete = can(PERMISSIONS.GOALS_DELETE);
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<GoalContribution>();

  const query = useGoalQuery(id);
  const removeGoal = useDeleteGoalMutation({
    onSuccess: () => router.push("/goals"),
    successToast: { title: "Goal deleted" },
  });
  const removeContribution = useRemoveContributionMutation();
  const goal = query.data;

  if (query.isPending) {
    return (
      <InternalPageLayout
        title="Goal"
        subtitle="Progress, monthly plan and contributions."
        back={{ href: "/goals", label: "Goals" }}
      >
        <Skeleton className="h-40 rounded-xl bg-muted/50" />
      </InternalPageLayout>
    );
  }

  if (query.isError || !goal) {
    return (
      <InternalPageLayout
        title="Goal"
        subtitle="Progress, monthly plan and contributions."
        back={{ href: "/goals", label: "Goals" }}
      >
        <ErrorState
          title="Couldn't load this goal"
          description={query.error?.message || "It may have been deleted."}
          onRetry={() => void query.refetch()}
        />
      </InternalPageLayout>
    );
  }

  const { estimate } = goal;
  const kindLabel = GOAL_KIND_OPTIONS.find((option) => option.value === goal.kind)?.label;
  const money = (amount: number) => (
    <MoneyValue amount={amount} currencyCode={goal.currencyCode} language={language} />
  );

  return (
    <InternalPageLayout
      title={goal.name}
      createdBy={goal.createdByUserId}
      subtitle="Progress, monthly plan and contributions."
      back={{ href: "/goals", label: "Goals" }}
      actions={
        canUpdate || canDelete ? (
          <div className="flex items-center gap-2">
            {canUpdate ? (
              <>
                <Button
                  onClick={() => {
                    setEditing(undefined);
                    setAddOpen(true);
                  }}
                >
                  Add money
                </Button>
                <Button variant="outline" onClick={() => setLinkOpen(true)}>
                  Link transaction
                </Button>
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                  Edit
                </Button>
              </>
            ) : null}
            {canDelete ? (
              <Button variant="outline" size="icon" onClick={() => setDeleteOpen(true)}>
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                <span className="sr-only">Delete goal</span>
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={GOAL_STATE_BADGE[goal.state]}>{GOAL_STATE_LABELS[goal.state]}</Badge>
        <Typography variant="small-muted">{kindLabel}</Typography>
        {goal.targetDate ? (
          <Typography variant="small-muted">
            · by {formatShortDate(goal.targetDate, language)}
          </Typography>
        ) : null}
      </div>
      {goal.description ? <Typography variant="body-muted">{goal.description}</Typography> : null}

      <section className="rounded-xl border border-border/60 p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <Typography variant="small-muted">Saved</Typography>
            <div className="text-2xl">{money(goal.saved)}</div>
          </div>
          <Typography variant="small-muted">
            {estimate.percent}% of {money(goal.targetAmount)}
          </Typography>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${estimate.percent}%` }}
          />
        </div>
        <Typography variant="small-muted" className="mt-3">
          {describeOutlook(goal, language)}
        </Typography>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Still to go">{money(estimate.remaining)}</Stat>
        {goal.targetDate ? (
          <>
            <Stat
              label="Needed per month"
              hint={
                estimate.monthsLeft !== null
                  ? `${formatMonths(estimate.monthsLeft)} left`
                  : undefined
              }
            >
              {estimate.requiredMonthly !== null ? money(estimate.requiredMonthly) : "—"}
            </Stat>
            <Stat label="Should have by now" hint="At a steady pace to your date">
              {estimate.expectedSaved !== null ? money(estimate.expectedSaved) : "—"}
            </Stat>
          </>
        ) : goal.monthlyContribution ? (
          <>
            <Stat label="Per month">{money(goal.monthlyContribution)}</Stat>
            <Stat
              label="Finish date"
              hint={
                goal.expectedReturnBps
                  ? `With ${bpsToPercent(goal.expectedReturnBps)}% a year`
                  : undefined
              }
            >
              {estimate.projectedCompletionDate
                ? formatShortDate(estimate.projectedCompletionDate, language)
                : "—"}
            </Stat>
          </>
        ) : (
          <Stat label="Plan" hint="Edit the goal to add a date or a monthly amount">
            None yet
          </Stat>
        )}
      </div>

      <section className="rounded-xl border border-border/60 p-4">
        <Typography variant="small-strong" className="mb-2">
          Progress
        </Typography>
        <GoalProgressChart
          timeline={goal.timeline}
          targetAmount={goal.targetAmount}
          currencyCode={goal.currencyCode}
          language={language}
        />
        <Typography variant="small-muted" className="mt-2">
          Solid line: what you've put in. Dashed: where your monthly plan leads
          {goal.expectedReturnBps ? ", including the expected return" : ""}.
        </Typography>
      </section>

      <section className="rounded-xl border border-border/60 p-4">
        <Typography variant="small-strong">Contributions</Typography>
        {goal.contributions.length === 0 ? (
          <Typography variant="small-muted" className="mt-1">
            Nothing recorded yet.
          </Typography>
        ) : (
          <div className="mt-2">
            {goal.contributions.map((contribution) => (
              <ContributionRow
                key={contribution.id}
                contribution={contribution}
                currencyCode={goal.currencyCode}
                language={language}
                canUpdate={canUpdate}
                busy={removeContribution.isPending}
                onEdit={(item) => {
                  setEditing(item);
                  setAddOpen(true);
                }}
                onRemove={(item) =>
                  removeContribution.mutate({ id: goal.id, contributionId: item.id })
                }
              />
            ))}
          </div>
        )}
        {removeContribution.errorMessage ? (
          <Typography variant="small-destructive" className="mt-2">
            {removeContribution.errorMessage}
          </Typography>
        ) : null}
      </section>

      <GoalSheet open={editOpen} onOpenChange={setEditOpen} goal={goal} />
      <ContributionModal
        open={addOpen}
        onOpenChange={setAddOpen}
        goalId={goal.id}
        contribution={editing}
      />
      <LinkGoalTransactionModal
        open={linkOpen}
        onOpenChange={setLinkOpen}
        goalId={goal.id}
        currencyCode={goal.currencyCode}
        language={language}
      />
      <Modal open={deleteOpen} onOpenChange={setDeleteOpen}>
        <ModalContent
          variant="destructive"
          title="Delete goal?"
          description={`"${goal.name}" and its contribution history will be removed. Linked transactions are kept.`}
          isLoading={removeGoal.isPending}
          size="sm"
        >
          <ModalBody>
            {removeGoal.errorMessage ? (
              <Typography variant="small-destructive">{removeGoal.errorMessage}</Typography>
            ) : null}
          </ModalBody>
          <ModalFooter
            cancelLabel="Cancel"
            confirmLabel="Delete goal"
            confirmVariant="destructive"
            onConfirm={() => removeGoal.mutate(goal.id)}
            isLoading={removeGoal.isPending}
            loadingLabel="Deleting..."
          />
        </ModalContent>
      </Modal>
    </InternalPageLayout>
  );
}
