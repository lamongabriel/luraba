"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Bill, BillFrequency } from "@luraba/contracts";
import { formatISODate } from "@luraba/domain";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { FormItem } from "@/components/forms/form-item";
import { FormSheet } from "@/components/forms/form-sheet";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import {
  BILL_FREQUENCY_OPTIONS,
  usesDayOfMonth,
  usesDayOfWeek,
  WEEKDAY_OPTIONS,
} from "@/lib/bills";
import { majorToMinorUnits, minorToMajorUnits } from "@/lib/finance";
import { useCreateBillMutation, useUpdateBillMutation } from "@/mutations/bills/use-bill-mutations";
import { useCurrenciesQuery } from "@/queries/currencies/use-currencies-query";

const numberField = z.union([z.number(), z.literal("")]);

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(255),
  amount: numberField,
  currencyCode: z.string().length(3, "Pick a currency."),
  frequency: z.enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"]),
  dayOfMonth: numberField,
  dayOfWeek: z.string(),
  startDate: z.string().min(1, "Pick a start date."),
  duration: z.enum(["forever", "installments", "until"]),
  installmentCount: numberField,
  endDate: z.string(),
  alreadyPaidCount: numberField,
  remindDaysBefore: numberField,
  audience: z.enum(["owner", "household"]),
});

type Values = z.infer<typeof schema>;

const DURATION_OPTIONS = [
  { value: "forever", label: "Forever" },
  { value: "installments", label: "A set number of payments" },
  { value: "until", label: "Until an end date" },
];

const AUDIENCE_OPTIONS = [
  { value: "owner", label: "Only me" },
  { value: "household", label: "Everyone in the household" },
];

function getDefaults(bill: Bill | undefined, precision: number): Values {
  return {
    name: bill?.name ?? "",
    amount: bill ? minorToMajorUnits(bill.expectedAmount, precision) : "",
    currencyCode: bill?.currencyCode ?? "BRL",
    frequency: bill?.frequency ?? "monthly",
    dayOfMonth: bill?.dayOfMonth ?? new Date().getDate(),
    dayOfWeek: String(bill?.dayOfWeek ?? new Date().getDay()),
    startDate: bill?.startDate ?? formatISODate(new Date()),
    duration: bill?.installmentCount ? "installments" : bill?.endDate ? "until" : "forever",
    installmentCount: bill?.installmentCount ?? "",
    endDate: bill?.endDate ?? "",
    alreadyPaidCount: "",
    remindDaysBefore: bill?.remindDaysBefore ?? "",
    audience: bill?.audience ?? "owner",
  };
}

function BillForm({
  bill,
  onCancel,
  onSuccess,
}: {
  bill?: Bill;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const isEdit = Boolean(bill);
  const currencies = useCurrenciesQuery({ perPage: 100 });
  const currencyList = currencies.data?.data ?? [];

  const form = useForm<Values>({
    defaultValues: getDefaults(bill, 2),
    resolver: zodResolver(schema),
  });

  const createMutation = useCreateBillMutation({ onSuccess });
  const updateMutation = useUpdateBillMutation({ onSuccess });
  const isPending = createMutation.isPending || updateMutation.isPending;
  const errorMessage = createMutation.errorMessage || updateMutation.errorMessage;

  const frequency = form.watch("frequency") as BillFrequency;
  const duration = form.watch("duration");
  const currencyCode = form.watch("currencyCode");

  const onSubmit = form.handleSubmit((values) => {
    if (values.amount === "" || values.amount <= 0) {
      form.setError("amount", { message: "Enter an amount greater than zero." });
      return;
    }

    const precision = currencyList.find((c) => c.code === values.currencyCode)?.precision ?? 2;
    const installments =
      values.duration === "installments" && values.installmentCount !== ""
        ? values.installmentCount
        : null;

    if (values.duration === "installments" && installments === null) {
      form.setError("installmentCount", { message: "Enter how many payments." });
      return;
    }
    if (values.duration === "until" && !values.endDate) {
      form.setError("endDate", { message: "Pick an end date." });
      return;
    }

    const body = {
      name: values.name.trim(),
      expectedAmount: majorToMinorUnits(values.amount, precision),
      currencyCode: values.currencyCode,
      frequency: values.frequency,
      dayOfMonth: usesDayOfMonth(values.frequency)
        ? values.dayOfMonth === ""
          ? null
          : values.dayOfMonth
        : null,
      dayOfWeek: usesDayOfWeek(values.frequency) ? Number(values.dayOfWeek) : null,
      startDate: values.startDate,
      endDate: values.duration === "until" ? values.endDate : null,
      installmentCount: installments,
      remindDaysBefore: values.remindDaysBefore === "" ? null : values.remindDaysBefore,
      audience: values.audience,
    };

    if (bill) {
      updateMutation.reset();
      updateMutation.mutate({ id: bill.id, body });
      return;
    }

    createMutation.reset();
    createMutation.mutate({
      ...body,
      alreadyPaidCount: values.alreadyPaidCount === "" ? undefined : values.alreadyPaidCount,
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <FormItem
        control={form.control}
        name="name"
        label="Name"
        placeholder="Water bill"
        disabled={isPending}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormItem
          control={form.control}
          name="amount"
          label="Expected amount"
          inputType="number"
          step="0.01"
          description="What you usually pay. You can change it per payment later."
          disabled={isPending}
        />
        <FormItem
          control={form.control}
          name="currencyCode"
          label="Currency"
          type="select"
          options={(currencyList.length > 0
            ? currencyList.map((c) => ({ value: c.code, label: `${c.code} (${c.symbol})` }))
            : [{ value: currencyCode, label: currencyCode }]
          ).slice(0, 100)}
          disabled={isPending || isEdit}
        />
      </div>

      <FormItem
        control={form.control}
        name="frequency"
        label="Repeats"
        type="select"
        options={BILL_FREQUENCY_OPTIONS}
        disabled={isPending}
      />

      {usesDayOfMonth(frequency) ? (
        <FormItem
          control={form.control}
          name="dayOfMonth"
          label="Day of the month"
          inputType="number"
          description="Short months use their last day."
          disabled={isPending}
        />
      ) : (
        <FormItem
          control={form.control}
          name="dayOfWeek"
          label="Day of the week"
          type="select"
          options={WEEKDAY_OPTIONS}
          disabled={isPending}
        />
      )}

      <FormItem
        control={form.control}
        name="startDate"
        label="First due date"
        inputType="date"
        disabled={isPending}
      />

      <FormItem
        control={form.control}
        name="duration"
        label="Lasts"
        type="select"
        options={DURATION_OPTIONS}
        disabled={isPending}
      />

      {duration === "installments" ? (
        <FormItem
          control={form.control}
          name="installmentCount"
          label="Number of payments"
          inputType="number"
          description="A loan or land plan with 48 installments, for example."
          disabled={isPending}
        />
      ) : null}
      {duration === "until" ? (
        <FormItem
          control={form.control}
          name="endDate"
          label="Last due date"
          inputType="date"
          disabled={isPending}
        />
      ) : null}
      {!isEdit && duration === "installments" ? (
        <FormItem
          control={form.control}
          name="alreadyPaidCount"
          label="Already paid"
          inputType="number"
          description="Payments made before you started tracking here, counted from the first one."
          disabled={isPending}
        />
      ) : null}

      <FormItem
        control={form.control}
        name="remindDaysBefore"
        label="Remind me early (days)"
        inputType="number"
        description="Optional. You're always reminded on the due date and when it's overdue."
        disabled={isPending}
      />
      <FormItem
        control={form.control}
        name="audience"
        label="Who gets reminders"
        type="select"
        options={AUDIENCE_OPTIONS}
        disabled={isPending}
      />

      {errorMessage ? <Typography variant="small-destructive">{errorMessage}</Typography> : null}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isPending}
          loadingText={isEdit ? "Saving..." : "Creating..."}
        >
          {isEdit ? "Save changes" : "Create bill"}
        </Button>
      </div>
    </form>
  );
}

export function BillSheet({
  open,
  onOpenChange,
  bill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill?: Bill;
}) {
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={bill ? "Edit bill" : "New bill"}
      description={
        bill
          ? "Changing the schedule rebuilds upcoming payments. Paid history stays as it is."
          : "Track a payment that repeats: a utility, rent, or a loan with a fixed number of installments."
      }
    >
      <FormErrorBoundary>
        <BillForm key={bill?.id ?? "create"} bill={bill} onCancel={close} onSuccess={close} />
      </FormErrorBoundary>
    </FormSheet>
  );
}
