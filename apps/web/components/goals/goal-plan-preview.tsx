"use client";

import {
  estimateGoal,
  formatISODate,
  formatShortDate,
  monthsToReach,
  parseISODate,
  shiftMonths,
  todayISODate,
} from "@luraba/domain";
import type * as React from "react";
import { MoneyValue } from "@/components/finance/money-value";
import { Typography } from "@/components/ui/typography";
import { majorToMinorUnits } from "@/lib/finance";
import { formatMonths, percentToBps } from "@/lib/goals";
import { cn } from "@/lib/utils";

type Input = number | "";

export type GoalPlanPreviewProps = {
  kind: "savings" | "investment";
  plan: "none" | "date" | "monthly";
  targetAmount: Input;
  monthlyContribution: Input;
  targetDate: string;
  startDate: string;
  expectedReturnPercent: Input;
  /** What is already saved (0 for a new goal). */
  saved: number;
  currencyCode: string;
  precision: number;
  language: string;
  onPickMonthly: (amount: number) => void;
  onPickDate: (date: string) => void;
};

const MONTHLY_STEPS = [0.5, 1, 1.5, 2, 3];
const DATE_STEPS = [-6, 0, 6, 12, 24];

/** Live estimate while the form is being filled in. Runs in the browser, no request involved. */
export function GoalPlanPreview(props: GoalPlanPreviewProps) {
  const { plan, precision, currencyCode, language } = props;
  const target = typeof props.targetAmount === "number" ? props.targetAmount : 0;
  const targetMinor = majorToMinorUnits(target, precision);
  const today = parseISODate(todayISODate());
  const startDate = props.startDate ? parseISODate(props.startDate) : today;
  const returnBps =
    props.kind === "investment" && props.expectedReturnPercent !== ""
      ? percentToBps(props.expectedReturnPercent)
      : null;

  const money = (amount: number) => (
    <MoneyValue
      amount={amount}
      currencyCode={currencyCode}
      language={language}
      precision={precision}
    />
  );
  const base = {
    targetAmount: targetMinor,
    saved: props.saved,
    startDate,
    expectedReturnBps: returnBps,
    today,
  };

  if (plan === "none" || targetMinor <= 0) {
    return (
      <Typography variant="small-muted">
        {targetMinor <= 0
          ? "Enter a target to see how it could play out."
          : "Pick a date or a monthly amount to see an estimate."}
      </Typography>
    );
  }

  let headline: React.ReactNode = null;
  const rows: Array<{
    key: string;
    label: React.ReactNode;
    result: React.ReactNode;
    active: boolean;
    pick: () => void;
  }> = [];

  if (plan === "monthly") {
    const monthly = typeof props.monthlyContribution === "number" ? props.monthlyContribution : 0;
    if (monthly <= 0) {
      return (
        <Typography variant="small-muted">
          Enter a monthly amount to see when you'd finish.
        </Typography>
      );
    }
    const finishOf = (major: number) => {
      const months = monthsToReach({
        ...base,
        monthlyContribution: majorToMinorUnits(major, precision),
      });
      return months === null ? null : { months, date: shiftMonths(today, months) };
    };
    const main = finishOf(monthly);
    headline = main ? (
      <>
        Putting in {money(majorToMinorUnits(monthly, precision))} a month, you'll reach it on{" "}
        <strong>{formatShortDate(formatISODate(main.date), language)}</strong> (
        {formatMonths(main.months)}).
      </>
    ) : (
      <>That amount would take more than 50 years.</>
    );

    for (const step of MONTHLY_STEPS) {
      const amount = Math.max(0.01, Math.round(monthly * step * 100) / 100);
      const finish = finishOf(amount);
      rows.push({
        key: `m${step}`,
        label: money(majorToMinorUnits(amount, precision)),
        result: finish
          ? `${formatShortDate(formatISODate(finish.date), language)} · ${formatMonths(finish.months)}`
          : "50+ years",
        active: step === 1,
        pick: () => props.onPickMonthly(amount),
      });
    }
  } else {
    const date = props.targetDate ? parseISODate(props.targetDate) : null;
    if (!date || date <= today) {
      return (
        <Typography variant="small-muted">
          Pick a date in the future to see the monthly amount.
        </Typography>
      );
    }
    const neededFor = (when: Date) =>
      estimateGoal({ ...base, monthlyContribution: null, targetDate: when });
    const main = neededFor(date);
    headline = (
      <>
        To reach it by <strong>{formatShortDate(props.targetDate, language)}</strong>, put in{" "}
        <strong>{money(main.requiredMonthly ?? 0)}</strong> a month for{" "}
        {formatMonths(Math.max(1, main.monthsLeft ?? 0))}.
      </>
    );

    for (const step of DATE_STEPS) {
      const when = step === 0 ? date : shiftMonths(date, step);
      if (when <= today) continue;
      const estimate = neededFor(when);
      rows.push({
        key: `d${step}`,
        label: formatShortDate(formatISODate(when), language),
        result: <>{money(estimate.requiredMonthly ?? 0)} a month</>,
        active: step === 0,
        pick: () => props.onPickDate(formatISODate(when)),
      });
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3">
      <Typography variant="small">{headline}</Typography>
      {rows.length > 0 ? (
        <div className="space-y-1">
          <Typography variant="small-muted">
            {plan === "monthly" ? "What if you put in…" : "What if you aim for…"}
          </Typography>
          {rows.map((row) => (
            <button
              key={row.key}
              type="button"
              onClick={row.pick}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                row.active && "bg-muted font-medium",
              )}
            >
              <span>{row.label}</span>
              <span className="text-muted-foreground">{row.result}</span>
            </button>
          ))}
        </div>
      ) : null}
      {props.saved > 0 ? (
        <Typography variant="small-muted">
          Counting the {money(props.saved)} already saved.
        </Typography>
      ) : null}
    </div>
  );
}
