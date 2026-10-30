"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ApuracaoLine } from "@luraba/contracts";
import { todayISODate } from "@luraba/domain";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { FormItem } from "@/components/forms/form-item";
import { FormSheet } from "@/components/forms/form-sheet";
import { shiftDecimal } from "@/components/investments/format";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { useMarkDarfPaidMutation } from "@/mutations/investments/use-investments-mutations";
import { useInvestmentAccountsQuery } from "@/queries/investments/use-investments-queries";

import { ExactDateField, ExactNumberField } from "./exact-fields";

const schema = z.object({
  accountId: z.string().min(1, "Choose an account."),
  amount: z.string().regex(/^\d+(\.\d+)?$/u, "Enter the amount paid."),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Choose a date."),
});
type Values = z.infer<typeof schema>;

function DarfPaidForm({
  line,
  accountId,
  precision,
  onCancel,
  onSuccess,
}: {
  line: ApuracaoLine;
  accountId?: string;
  precision: number;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const accounts = useInvestmentAccountsQuery();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      accountId: accountId ?? "",
      amount: shiftDecimal(String(line.taxDue), -precision),
      paidDate: todayISODate(),
    },
  });
  const mutation = useMarkDarfPaidMutation({
    successToast: { title: "DARF marked as paid" },
    onSuccess,
  });

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        mutation.reset();
        mutation.mutate({
          accountId: values.accountId,
          month: line.month,
          bucket: line.bucket,
          amount: values.amount,
          paidDate: values.paidDate,
        });
      })}
    >
      <FormItem
        type="select"
        control={form.control}
        name="accountId"
        label="Account"
        options={(accounts.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
        disabled={mutation.isPending || Boolean(accountId)}
      />
      <ExactNumberField
        control={form.control}
        name="amount"
        kind="money"
        precision={precision}
        label="Amount paid"
        disabled={mutation.isPending}
      />
      <ExactDateField
        control={form.control}
        name="paidDate"
        label="Paid on"
        disabled={mutation.isPending}
      />
      {mutation.errorMessage ? (
        <Typography variant="small-destructive">{mutation.errorMessage}</Typography>
      ) : null}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={mutation.isPending} loadingText="Saving...">
          Mark as paid
        </Button>
      </div>
    </form>
  );
}

/** Record that a monthly DARF was paid, so the reminder stops and the cash leaves the account. */
export function DarfPaidSheet({
  line,
  accountId,
  precision,
  onOpenChange,
}: {
  line: ApuracaoLine | undefined;
  accountId?: string;
  precision: number;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <FormSheet
      open={Boolean(line)}
      onOpenChange={onOpenChange}
      title="Mark DARF as paid"
      description={line ? `Month ${line.month}. Confirm what you paid and when.` : undefined}
    >
      {line ? (
        <FormErrorBoundary>
          <DarfPaidForm
            key={`${line.month}-${line.bucket}`}
            line={line}
            accountId={accountId}
            precision={precision}
            onCancel={() => onOpenChange(false)}
            onSuccess={() => onOpenChange(false)}
          />
        </FormErrorBoundary>
      ) : null}
    </FormSheet>
  );
}
