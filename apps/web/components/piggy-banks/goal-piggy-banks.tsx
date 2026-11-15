"use client";

import {
  buildProjectionSeries,
  type PiggyGoalPlanInput,
  type PiggyPlanMode,
  planWithYield,
  todayISODate,
} from "@luraba/domain";
import * as React from "react";

import { AmountDisplay, PiggyBankDisplay } from "@/components/display";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PanelCard } from "@/components/finance/panel-card";
import { ListRow } from "@/components/lists";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Typography } from "@/components/ui/typography";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { majorToMinorUnits, minorToMajorUnits } from "@/lib/finance";
import { useSetGoalPiggyBanksMutation } from "@/mutations/piggy-banks/use-piggy-bank-mutations";
import {
  useGoalPiggyPlanQuery,
  usePiggyBanksQuery,
} from "@/queries/piggy-banks/use-piggy-banks-queries";
import { PiggyBankProjectionChart } from "./piggy-bank-projection-chart";

const MODES: { value: PiggyPlanMode; label: string }[] = [
  { value: "target_by_date", label: "Reach it by a date" },
  { value: "fixed_monthly", label: "Deposit a set amount" },
  { value: "fixed_monthly_for_months", label: "Set amount for N months" },
];

const STATUS_LABEL = {
  on_track: "On track",
  behind: "Behind",
  ahead: "Ahead",
  upcoming: "Upcoming",
} as const;

function LinkModal({
  open,
  onOpenChange,
  goalId,
  linkedIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  linkedIds: string[];
}) {
  const all = usePiggyBanksQuery();
  const [selected, setSelected] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (open) setSelected(linkedIds);
  }, [open, linkedIds]);
  const save = useSetGoalPiggyBanksMutation({
    onSuccess: () => onOpenChange(false),
    successToast: { title: "Linked piggy banks updated" },
  });
  const options = all.data?.piggyBanks ?? [];
  const toggle = (id: string, on: boolean) =>
    setSelected((current) => (on ? [...current, id] : current.filter((item) => item !== id)));
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title="Link piggy banks"
        description="The goal's progress becomes the sum of the linked piggy banks, interest included."
        isLoading={save.isPending}
        size="sm"
      >
        <ModalBody className="space-y-2">
          {options.length === 0 ? (
            <Typography variant="small-muted">Create a piggy bank first.</Typography>
          ) : (
            options.map((piggy) => (
              <div key={piggy.id} className="flex items-center justify-between gap-3">
                <Label htmlFor={`link-${piggy.id}`} className="min-w-0 flex-1">
                  <PiggyBankDisplay piggyBank={piggy} size="md" detail={piggy.parentAccountName} />
                </Label>
                <Switch
                  id={`link-${piggy.id}`}
                  checked={selected.includes(piggy.id)}
                  onCheckedChange={(on) => toggle(piggy.id, on)}
                />
              </div>
            ))
          )}
          {save.errorMessage ? (
            <Typography variant="small-destructive">{save.errorMessage}</Typography>
          ) : null}
        </ModalBody>
        <ModalFooter
          cancelLabel="Cancel"
          confirmLabel="Save"
          isLoading={save.isPending}
          loadingLabel="Saving..."
          onConfirm={() => save.mutate({ goalId, piggyBankIds: selected })}
        />
      </ModalContent>
    </Modal>
  );
}

/**
 * The piggy bank side of a goal: the linked piggy banks, the plan (three modes, yield aware) with scenario
 * sliders that re-run the same maths in the browser, the projection chart and planned vs actual by month.
 */
export function GoalPiggyBanksSection({ goalId, language }: { goalId: string; language: string }) {
  const query = useGoalPiggyPlanQuery(goalId);
  const precisionOf = useCurrencyPrecision();
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [mode, setMode] = React.useState<PiggyPlanMode>("fixed_monthly");
  const [monthlyMajor, setMonthlyMajor] = React.useState<number | null>(null);
  const [months, setMonths] = React.useState(24);
  const [ratePercent, setRatePercent] = React.useState<number | null>(null);

  const data = query.data;
  React.useEffect(() => {
    if (!data) return;
    const precision = precisionOf(data.currencyCode);
    if (data.plan) {
      setMode(data.plan.mode);
      setMonthlyMajor(
        (current) => current ?? minorToMajorUnits(data.plan?.monthly ?? 0, precision),
      );
      if (data.plan.months) setMonths(data.plan.months);
    }
    setRatePercent((current) => current ?? Math.round(data.annualRate * 10_000) / 100);
  }, [data, precisionOf]);

  if (query.isPending) {
    return (
      <PanelCard title="Piggy banks" iconFrame={false}>
        <div className="space-y-3" role="status" aria-label="Loading piggy banks">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PanelCard>
    );
  }
  if (query.isError || !data) {
    return (
      <ErrorState
        title="Couldn't load the piggy bank plan"
        description={query.error?.message}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const currency = data.currencyCode;
  const precision = precisionOf(currency);
  const money = { currencyCode: currency, language, precision };
  const linkedIds = data.piggyBanks.map((piggy) => piggy.id);
  const linkAction = (
    <PermissionButton
      permission={PERMISSIONS.GOALS_UPDATE}
      deniedMessage="Your household role cannot change goals."
      variant="outline"
      size="sm"
      onClick={() => setLinkOpen(true)}
    >
      {linkedIds.length === 0 ? "Link piggy banks" : "Change links"}
    </PermissionButton>
  );

  if (linkedIds.length === 0) {
    return (
      <>
        <EmptyState
          title="Not linked to a piggy bank"
          description="Link piggy banks and this goal follows their balances, interest included."
          action={linkAction}
        />
        <LinkModal open={linkOpen} onOpenChange={setLinkOpen} goalId={goalId} linkedIds={[]} />
      </>
    );
  }

  const monthly = majorToMinorUnits(monthlyMajor ?? 0, precision);
  const annualRate = (ratePercent ?? 0) / 100;
  const input: PiggyGoalPlanInput =
    mode === "target_by_date"
      ? { mode, start: data.saved, target: data.targetAmount, months, annualRate }
      : mode === "fixed_monthly"
        ? { mode, start: data.saved, target: data.targetAmount, monthly, annualRate }
        : { mode, start: data.saved, target: data.targetAmount, monthly, months, annualRate };
  const plan = planWithYield(input);
  const horizon = Math.min(Math.max(plan.months ?? months, 1), 120);
  const points = buildProjectionSeries({
    startMonth: `${todayISODate().slice(0, 7)}-01`,
    start: data.saved,
    monthly: plan.monthly,
    annualRate,
    months: horizon,
    target: data.targetAmount,
  });
  const sliderMax = Math.max(
    10,
    Math.ceil(minorToMajorUnits(data.targetAmount, precision) / 6),
    Math.ceil((monthlyMajor ?? 0) * 2),
  );

  return (
    <div className="space-y-5">
      <PanelCard
        title="Linked piggy banks"
        description="Progress is the sum of these balances."
        actions={linkAction}
      >
        <div>
          {data.piggyBanks.map((piggy) => (
            <ListRow
              key={piggy.id}
              title={piggy.title}
              subtitle={`${(piggy.annualRate * 100).toFixed(2)}% a year expected`}
              amount={<AmountDisplay amount={piggy.balanceInGoalCurrency} {...money} />}
            />
          ))}
        </div>
      </PanelCard>

      <PanelCard title="Plan" description="Move the sliders to try a scenario. Nothing is saved.">
        <div className="space-y-4">
          <div className="grid gap-1.5 sm:grid-cols-3">
            {MODES.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={mode === item.value ? "default" : "outline"}
                onClick={() => setMode(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {mode === "target_by_date" ? null : (
              <div className="space-y-2">
                <Label>Per month: {monthlyMajor ?? 0}</Label>
                <Slider
                  min={0}
                  max={sliderMax}
                  step={10}
                  value={[monthlyMajor ?? 0]}
                  onValueChange={([value]) => setMonthlyMajor(value ?? 0)}
                />
              </div>
            )}
            {mode === "fixed_monthly" ? null : (
              <div className="space-y-2">
                <Label>Months: {months}</Label>
                <Slider
                  min={1}
                  max={120}
                  step={1}
                  value={[months]}
                  onValueChange={([value]) => setMonths(value ?? 1)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Yearly return: {ratePercent ?? 0}%</Label>
              <Slider
                min={0}
                max={25}
                step={0.25}
                value={[ratePercent ?? 0]}
                onValueChange={([value]) => setRatePercent(value ?? 0)}
              />
            </div>
          </div>
          <Typography variant="small-muted">
            {plan.months === null
              ? "At this pace the target is never reached."
              : mode === "target_by_date"
                ? `Deposit about ${(minorToMajorUnits(plan.monthly, precision)).toFixed(2)} a month for ${plan.months} months.`
                : `${plan.reachesTarget ? "Reaches" : "Ends below"} the target after ${plan.months} months with ${(minorToMajorUnits(plan.finalValue ?? 0, precision)).toFixed(2)}, of which interest is ${(minorToMajorUnits(plan.interest ?? 0, precision)).toFixed(2)}.`}
          </Typography>
        </div>
      </PanelCard>

      <PiggyBankProjectionChart
        title="Projection"
        description="Balance with interest against deposits only."
        points={points}
        currencyCode={currency}
        precision={precision}
        language={language}
      />

      {data.tracking ? (
        <PanelCard
          title="Planned vs actual"
          description={
            data.tracking.catchUp > 0
              ? "You are behind plan. Catch up with the amount below."
              : "Deposits into the linked piggy banks, month by month."
          }
        >
          <div>
            {data.tracking.rows.map((row) => (
              <ListRow
                key={row.month}
                title={row.month}
                subtitle={`Planned ${minorToMajorUnits(row.planned, precision).toFixed(2)}`}
                amount={<AmountDisplay amount={row.actual} {...money} />}
                meta={
                  row.catchUp > 0
                    ? `${STATUS_LABEL[row.status]} · catch up ${minorToMajorUnits(row.catchUp, precision).toFixed(2)}`
                    : STATUS_LABEL[row.status]
                }
              />
            ))}
          </div>
        </PanelCard>
      ) : null}

      <LinkModal open={linkOpen} onOpenChange={setLinkOpen} goalId={goalId} linkedIds={linkedIds} />
    </div>
  );
}
