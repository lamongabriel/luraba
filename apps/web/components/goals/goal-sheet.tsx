"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { GoalDetail } from "@luraba/contracts";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { FormItem } from "@/components/forms/form-item";
import { FormSheet } from "@/components/forms/form-sheet";
import { GoalPlanPreview } from "@/components/goals/goal-plan-preview";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { majorToMinorUnits, minorToMajorUnits } from "@/lib/finance";
import { bpsToPercent, GOAL_KIND_OPTIONS, GOAL_STATUS_OPTIONS, percentToBps } from "@/lib/goals";
import { useCreateGoalMutation, useUpdateGoalMutation } from "@/mutations/goals/use-goal-mutations";
import { useCurrenciesQuery } from "@/queries/currencies/use-currencies-query";
import { useAuthSessionStore, useDefaultCurrencyCode } from "@/stores/auth-session-store";

const PLAN_OPTIONS = [
  { value: "date", label: "I want to reach it by a date" },
  { value: "monthly", label: "I'll put in a set amount each month" },
  { value: "none", label: "No plan yet" },
];

const numberField = z.union([z.number(), z.literal("")]);

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(255),
  description: z.string(),
  kind: z.enum(["savings", "investment"]),
  targetAmount: z.number({ error: "Enter the amount you want to reach." }).positive(),
  currencyCode: z.string().length(3),
  plan: z.enum(["none", "date", "monthly"]),
  startDate: z.string(),
  targetDate: z.string(),
  monthlyContribution: numberField,
  expectedReturnPercent: numberField,
  status: z.enum(["active", "paused", "canceled"]),
});

type Values = z.infer<typeof schema>;

function GoalForm({
  goal,
  onCancel,
  onSuccess,
}: {
  goal?: GoalDetail;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const defaultCurrency = useDefaultCurrencyCode();
  const currencies = useCurrenciesQuery({ perPage: 100 });
  const currencyList = currencies.data?.data ?? [];
  const precisionOf = (code: string) => currencyList.find((c) => c.code === code)?.precision ?? 2;
  const precision = precisionOf(goal?.currencyCode ?? defaultCurrency);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: goal?.name ?? "",
      description: goal?.description ?? "",
      kind: goal?.kind ?? "savings",
      targetAmount: goal ? minorToMajorUnits(goal.targetAmount, precision) : ("" as never),
      currencyCode: goal?.currencyCode ?? defaultCurrency,
      plan: goal?.targetDate ? "date" : goal?.monthlyContribution ? "monthly" : "none",
      startDate: goal?.startDate ?? "",
      targetDate: goal?.targetDate ?? "",
      monthlyContribution: goal?.monthlyContribution
        ? minorToMajorUnits(goal.monthlyContribution, precision)
        : "",
      expectedReturnPercent: goal?.expectedReturnBps ? bpsToPercent(goal.expectedReturnBps) : "",
      status: goal?.status ?? "active",
    },
  });

  const createMutation = useCreateGoalMutation({
    onSuccess,
    successToast: { title: "Goal created" },
  });
  const updateMutation = useUpdateGoalMutation({
    onSuccess,
    successToast: { title: "Goal updated" },
  });
  const isPending = createMutation.isPending || updateMutation.isPending;
  const errorMessage = createMutation.errorMessage || updateMutation.errorMessage;
  const kind = form.watch("kind");
  const plan = form.watch("plan");
  const watched = form.watch();
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const currencyCode = form.watch("currencyCode");

  const onSubmit = form.handleSubmit((values) => {
    const unit = precisionOf(values.currencyCode);
    const body = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      kind: values.kind,
      targetAmount: majorToMinorUnits(values.targetAmount, unit),
      // One way to plan: a date (we work out the monthly amount) or a monthly amount (we work out the date).
      targetDate: values.plan === "date" && values.targetDate ? values.targetDate : null,
      monthlyContribution:
        values.plan !== "monthly" || values.monthlyContribution === ""
          ? null
          : majorToMinorUnits(values.monthlyContribution, unit),
      expectedReturnBps:
        values.kind === "investment" && values.expectedReturnPercent !== ""
          ? percentToBps(values.expectedReturnPercent)
          : null,
    };

    if (goal) {
      updateMutation.reset();
      updateMutation.mutate({
        id: goal.id,
        body: { ...body, startDate: values.startDate || undefined, status: values.status },
      });
      return;
    }

    createMutation.reset();
    createMutation.mutate({
      ...body,
      currencyCode: values.currencyCode,
      startDate: values.startDate || undefined,
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <FormItem
        control={form.control}
        name="name"
        label="Goal"
        placeholder="Emergency fund"
        disabled={isPending}
      />
      <FormItem
        control={form.control}
        name="kind"
        label="Type"
        type="select"
        options={GOAL_KIND_OPTIONS}
        disabled={isPending}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormItem
          control={form.control}
          name="targetAmount"
          label="Target"
          inputType="money"
          disabled={isPending}
        />
        <FormItem
          control={form.control}
          name="currencyCode"
          label="Currency"
          type="select"
          options={
            currencyList.length > 0
              ? currencyList.map((c) => ({ value: c.code, label: `${c.code} (${c.symbol})` }))
              : [{ value: currencyCode, label: currencyCode }]
          }
          disabled={isPending || Boolean(goal)}
        />
      </div>
      <FormItem
        control={form.control}
        name="plan"
        label="How do you want to plan it?"
        type="select"
        options={PLAN_OPTIONS}
        disabled={isPending}
      />
      {plan === "date" ? (
        <FormItem
          control={form.control}
          name="targetDate"
          label="Reach it by"
          inputType="date"
          description="We'll work out how much to put in each month."
          disabled={isPending}
        />
      ) : null}
      {plan === "monthly" ? (
        <FormItem
          control={form.control}
          name="monthlyContribution"
          label="Per month"
          inputType="money"
          description="We'll work out when you'll get there."
          disabled={isPending}
        />
      ) : null}
      {kind === "investment" ? (
        <FormItem
          control={form.control}
          name="expectedReturnPercent"
          label="Expected yearly return (%)"
          inputType="decimal"
          decimals={2}
          description="Optional. Used only for the estimate; nothing is guaranteed."
          disabled={isPending}
        />
      ) : null}
      <GoalPlanPreview
        kind={kind}
        plan={plan}
        targetAmount={watched.targetAmount}
        monthlyContribution={watched.monthlyContribution}
        targetDate={watched.targetDate}
        startDate={watched.startDate}
        expectedReturnPercent={watched.expectedReturnPercent}
        saved={goal?.saved ?? 0}
        currencyCode={currencyCode}
        precision={precisionOf(currencyCode)}
        language={language}
        onPickMonthly={(amount) => form.setValue("monthlyContribution", amount)}
        onPickDate={(date) => form.setValue("targetDate", date)}
      />
      <FormItem
        control={form.control}
        name="startDate"
        label="Started on"
        inputType="date"
        description="Defaults to today."
        disabled={isPending}
      />
      <FormItem
        control={form.control}
        name="description"
        label="Notes"
        type="textarea"
        rows={2}
        disabled={isPending}
      />
      {goal ? (
        <FormItem
          control={form.control}
          name="status"
          label="Status"
          type="select"
          options={GOAL_STATUS_OPTIONS}
          disabled={isPending}
        />
      ) : null}

      {errorMessage ? <Typography variant="small-destructive">{errorMessage}</Typography> : null}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} loadingText="Saving...">
          {goal ? "Save changes" : "Create goal"}
        </Button>
      </div>
    </form>
  );
}

export function GoalSheet({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: GoalDetail;
}) {
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={goal ? "Edit goal" : "New goal"}
      description={
        goal
          ? "Change the target, the monthly plan or the date."
          : "Set an amount to save or invest, and how much you'll put in each month."
      }
    >
      <FormErrorBoundary>
        <GoalForm
          key={`${goal?.id ?? "new"}-${open}`}
          goal={goal}
          onCancel={close}
          onSuccess={close}
        />
      </FormErrorBoundary>
    </FormSheet>
  );
}
