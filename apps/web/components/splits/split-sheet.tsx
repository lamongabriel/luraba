"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { SplitDetail } from "@luraba/contracts";
import { formatISODate } from "@luraba/domain";
import * as React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { FormItem } from "@/components/forms/form-item";
import { FormSheet } from "@/components/forms/form-sheet";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { majorToMinorUnits, minorToMajorUnits } from "@/lib/finance";
import { generateMonthlyInstallments } from "@/lib/splits";
import {
  useAddParticipantMutation,
  useCreateSplitMutation,
  useUpdateSplitMutation,
} from "@/mutations/splits/use-split-mutations";
import { useCurrenciesQuery } from "@/queries/currencies/use-currencies-query";

const numberField = z.union([z.number(), z.literal("")]);

const participantSchema = z.object({
  name: z.string().trim().min(1, "Enter a name."),
  installmentCount: numberField,
  amount: numberField,
  firstDueDate: z.string(),
});

const schema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(255),
  description: z.string(),
  totalAmount: numberField,
  currencyCode: z.string().length(3),
  status: z.enum(["active", "closed"]),
  participants: z.array(participantSchema),
});

type Values = z.infer<typeof schema>;
type ParticipantValues = z.infer<typeof participantSchema>;

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
];

function emptyParticipant(): ParticipantValues {
  return { name: "", installmentCount: 1, amount: "", firstDueDate: formatISODate(new Date()) };
}

function toParticipantBody(participant: ParticipantValues, precision: number) {
  const count = participant.installmentCount === "" ? 0 : participant.installmentCount;
  const amount = participant.amount === "" ? 0 : participant.amount;

  return {
    name: participant.name.trim(),
    installments:
      count > 0 && amount > 0 && participant.firstDueDate
        ? generateMonthlyInstallments(
            count,
            majorToMinorUnits(amount, precision),
            participant.firstDueDate,
          )
        : [],
  };
}

function ParticipantFields({
  index,
  control,
  disabled,
  onRemove,
}: {
  index: number;
  control: ReturnType<typeof useForm<Values>>["control"];
  disabled: boolean;
  onRemove?: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-3">
      <FormItem
        control={control}
        name={`participants.${index}.name`}
        label="Person"
        placeholder="Pedro"
        disabled={disabled}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <FormItem
          control={control}
          name={`participants.${index}.installmentCount`}
          label="Installments"
          inputType="number"
          disabled={disabled}
        />
        <FormItem
          control={control}
          name={`participants.${index}.amount`}
          label="Each"
          inputType="number"
          step="0.01"
          disabled={disabled}
        />
        <FormItem
          control={control}
          name={`participants.${index}.firstDueDate`}
          label="First pays on"
          inputType="date"
          disabled={disabled}
        />
      </div>
      {onRemove ? (
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
          Remove person
        </Button>
      ) : null}
    </div>
  );
}

function SplitForm({
  split,
  mode,
  onCancel,
  onSuccess,
}: {
  split?: SplitDetail;
  mode: "create" | "edit" | "person";
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const currencies = useCurrenciesQuery({ perPage: 100 });
  const currencyList = currencies.data?.data ?? [];
  const precisionOf = (code: string) => currencyList.find((c) => c.code === code)?.precision ?? 2;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: split?.title ?? "",
      description: split?.description ?? "",
      totalAmount: split?.totalAmount
        ? minorToMajorUnits(split.totalAmount, precisionOf(split.currencyCode))
        : "",
      currencyCode: split?.currencyCode ?? "BRL",
      status: split?.status ?? "active",
      participants: mode === "edit" ? [] : [emptyParticipant()],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "participants" });

  const createMutation = useCreateSplitMutation({ onSuccess });
  const updateMutation = useUpdateSplitMutation({ onSuccess });
  const addMutation = useAddParticipantMutation({ onSuccess });
  const isPending = createMutation.isPending || updateMutation.isPending || addMutation.isPending;
  const errorMessage =
    createMutation.errorMessage || updateMutation.errorMessage || addMutation.errorMessage;
  const currencyCode = form.watch("currencyCode");

  const onSubmit = form.handleSubmit((values) => {
    const precision = precisionOf(values.currencyCode);

    if (mode === "person" && split) {
      const participant = values.participants[0];
      if (!participant) return;
      addMutation.reset();
      addMutation.mutate({ id: split.id, body: toParticipantBody(participant, precision) });
      return;
    }

    const total =
      values.totalAmount === "" ? null : majorToMinorUnits(values.totalAmount, precision);

    if (mode === "edit" && split) {
      updateMutation.reset();
      updateMutation.mutate({
        id: split.id,
        body: {
          title: values.title.trim(),
          description: values.description.trim() || null,
          totalAmount: total,
          status: values.status,
        },
      });
      return;
    }

    createMutation.reset();
    createMutation.mutate({
      title: values.title.trim(),
      description: values.description.trim() || null,
      totalAmount: total,
      currencyCode: values.currencyCode,
      participants: values.participants
        .filter((participant) => participant.name.trim())
        .map((participant) => toParticipantBody(participant, precision)),
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      {mode !== "person" ? (
        <>
          <FormItem
            control={form.control}
            name="title"
            label="What was shared"
            placeholder="Programming course"
            disabled={isPending}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormItem
              control={form.control}
              name="totalAmount"
              label="Total you paid"
              inputType="number"
              step="0.01"
              description="Optional, for reference."
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
              disabled={isPending || mode === "edit"}
            />
          </div>
          <FormItem
            control={form.control}
            name="description"
            label="Notes"
            type="textarea"
            rows={2}
            disabled={isPending}
          />
        </>
      ) : null}

      {mode === "edit" ? (
        <FormItem
          control={form.control}
          name="status"
          label="Status"
          type="select"
          options={STATUS_OPTIONS}
          disabled={isPending}
        />
      ) : (
        <div className="space-y-3">
          <Typography variant="small-strong">People paying you back</Typography>
          {fields.map((field, index) => (
            <ParticipantFields
              key={field.id}
              index={index}
              control={form.control}
              disabled={isPending}
              onRemove={mode === "create" ? () => remove(index) : undefined}
            />
          ))}
          {mode === "create" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append(emptyParticipant())}
              disabled={isPending}
            >
              Add another person
            </Button>
          ) : null}
        </div>
      )}

      {errorMessage ? <Typography variant="small-destructive">{errorMessage}</Typography> : null}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} loadingText="Saving...">
          {mode === "create" ? "Create split" : mode === "person" ? "Add person" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export function SplitSheet({
  open,
  onOpenChange,
  split,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  split?: SplitDetail;
  mode: "create" | "edit" | "person";
}) {
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);
  const title = { create: "New split", edit: "Edit split", person: "Add a person" }[mode];
  const description = {
    create: "Share a purchase with people who pay their part back over time.",
    edit: "Update the details of this shared purchase.",
    person: "Set how many installments they pay, how much, and when the first one is due.",
  }[mode];

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <FormErrorBoundary>
        <SplitForm
          key={`${mode}-${split?.id ?? "new"}-${open}`}
          split={split}
          mode={mode}
          onCancel={close}
          onSuccess={close}
        />
      </FormErrorBoundary>
    </FormSheet>
  );
}
