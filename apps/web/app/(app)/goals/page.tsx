"use client";

import { type Goal, MAX_PER_PAGE } from "@luraba/contracts";
import { formatISODate, getTodayInTimezone } from "@luraba/domain";
import { useRouter } from "next/navigation";
import * as React from "react";

import { CombinedAmountDisplay } from "@/components/display";
import { HeaderAddButton } from "@/components/finance/header-actions";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { ContributionModal } from "@/components/goals/contribution-modal";
import { type GoalAction, GoalCard } from "@/components/goals/goal-card";
import { GoalDetailDrawer } from "@/components/goals/goal-detail-drawer";
import { GOALS_GRID } from "@/components/goals/goal-layout";
import { GoalSheet } from "@/components/goals/goal-sheet";
import { LinkGoalTransactionModal } from "@/components/goals/link-transaction-modal";
import { PERMISSIONS, useCan } from "@/components/permissions";
import { DataBoundary } from "@/components/states";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCombinedAmount } from "@/hooks/use-combined-amount";
import { goalPace } from "@/lib/goal-pace";
import { useDeleteGoalMutation } from "@/mutations/goals/use-goal-mutations";
import { useGoalsQuery } from "@/queries/goals/use-goals-queries";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { GoalsEmpty } from "./_empty";
import { GoalsError } from "./_error";
import { GoalsLoading } from "./_loading";

/** Active goals first (paused, canceled and reached ones after), each group in the API's order. */
function orderGoals(goals: Goal[]): Goal[] {
  const rank = (goal: Goal) => (goal.state === "achieved" ? 1 : goal.status === "active" ? 0 : 2);
  return [...goals].sort((a, b) => rank(a) - rank(b));
}

export default function GoalsPage() {
  const router = useRouter();
  const can = useCan();
  const canUpdate = can(PERMISSIONS.GOALS_UPDATE);
  const canDelete = can(PERMISSIONS.GOALS_DELETE);
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const timezone = useAuthSessionStore((state) => state.user?.preferences.timezone ?? "UTC");
  const query = useGoalsQuery({ perPage: MAX_PER_PAGE });
  const goals = React.useMemo(() => orderGoals(query.data?.data ?? []), [query.data]);
  const today = formatISODate(getTodayInTimezone(timezone));
  // "Total saved": every goal that is not canceled, in the base currency (per-currency breakdown in the popover).
  const savedByCurrency = React.useMemo(() => {
    const totals: Record<string, number> = {};
    for (const goal of goals) {
      if (goal.status === "canceled") continue;
      totals[goal.currencyCode] = (totals[goal.currencyCode] ?? 0) + goal.saved;
    }
    return totals;
  }, [goals]);
  const saved = useCombinedAmount(savedByCurrency);
  const activeCount = goals.filter(
    (goal) => goal.status === "active" && goal.state !== "achieved",
  ).length;

  const [createOpen, setCreateOpen] = React.useState(false);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<Goal | null>(null);
  const [money, setMoney] = React.useState<{ goal: Goal; withdraw: boolean } | null>(null);
  const [linking, setLinking] = React.useState<Goal | null>(null);
  const [deleting, setDeleting] = React.useState<Goal | null>(null);
  const remove = useDeleteGoalMutation({
    onSuccess: () => setDeleting(null),
    successToast: { title: "Goal deleted" },
  });

  const opened = goals.find((goal) => goal.id === openId) ?? null;
  const paceOf = (goal: Goal) => goalPace(goal, today);

  const onAction = (action: GoalAction, goal: Goal) => {
    if (action === "open") router.push(`/goals/${goal.id}`);
    else if (action === "edit") setEditing(goal);
    else if (action === "add") setMoney({ goal, withdraw: false });
    else if (action === "withdraw") setMoney({ goal, withdraw: true });
    else if (action === "link") setLinking(goal);
    else setDeleting(goal);
  };

  return (
    <InternalPageLayout
      title="Goals"
      subtitle="Save toward what matters."
      kpisLoading={query.isPending || saved.isPending}
      kpiLabels={["Total saved", "Active goals"]}
      kpis={
        query.isPending || saved.isPending || goals.length === 0
          ? undefined
          : [
              {
                label: "Total saved",
                value: (
                  <CombinedAmountDisplay
                    combined={saved.combined}
                    fx={saved.fx}
                    language={language}
                    size="sm"
                  />
                ),
              },
              { label: "Active goals", value: activeCount },
            ]
      }
      actions={
        <HeaderAddButton
          label="Create goal"
          permission={PERMISSIONS.GOALS_CREATE}
          deniedMessage="Your household role cannot create goals."
          onClick={() => setCreateOpen(true)}
        />
      }
    >
      <DataBoundary
        isPending={query.isPending}
        isError={query.isError}
        isEmpty={goals.length === 0}
        loading={<GoalsLoading />}
        errorState={
          <GoalsError message={query.error?.message} onRetry={() => void query.refetch()} />
        }
        empty={<GoalsEmpty onCreate={() => setCreateOpen(true)} />}
      >
        <ul className={GOALS_GRID}>
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              pace={paceOf(goal)}
              language={language}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onOpen={(item) => setOpenId(item.id)}
              onAction={onAction}
            />
          ))}
        </ul>
      </DataBoundary>

      <GoalDetailDrawer
        goal={opened}
        pace={opened ? paceOf(opened) : null}
        language={language}
        canUpdate={canUpdate}
        onOpenChange={(open) => !open && setOpenId(null)}
        onAction={onAction}
      />
      <GoalSheet open={createOpen} onOpenChange={setCreateOpen} />
      <GoalSheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        goal={editing ?? undefined}
      />
      <ContributionModal
        open={money !== null}
        onOpenChange={(open) => !open && setMoney(null)}
        goalId={money?.goal.id ?? ""}
        initialWithdrawal={money?.withdraw}
      />
      <LinkGoalTransactionModal
        open={linking !== null}
        onOpenChange={(open) => !open && setLinking(null)}
        goalId={linking?.id ?? ""}
        currencyCode={linking?.currencyCode ?? ""}
        language={language}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        variant="destructive"
        title={`Delete ${deleting?.name ?? "this goal"}?`}
        description="Its contributions are removed too. Linked transactions stay."
        confirmLabel="Delete goal"
        isLoading={remove.isPending}
        errorMessage={remove.errorMessage}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </InternalPageLayout>
  );
}
