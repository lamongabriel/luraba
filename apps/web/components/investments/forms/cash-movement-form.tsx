"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { todayISODate } from "@luraba/domain";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormItem } from "@/components/forms/form-item";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { useAddCashMovementMutation } from "@/mutations/investments/use-investments-mutations";
import { useAccountsQuery } from "@/queries/accounts/use-accounts-query";
import { useInvestmentAccountsQuery } from "@/queries/investments/use-investments-queries";

import { ExactDateField, ExactNumberField } from "./exact-fields";
import { useCurrencyOptions } from "./use-currency-options";

const KINDS = [
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
  { value: "transfer_in", label: "Transfer in from another account" },
  { value: "transfer_out", label: "Transfer out to another account" },
  { value: "fx_conversion", label: "Currency conversion" },
  { value: "interest", label: "Interest on cash" },
  { value: "fee", label: "Fee" },
] as const;

const schema = z
  .object({
    accountId: z.string().min(1, "Choose an account."),
    kind: z.enum(KINDS.map((item) => item.value) as [string, ...string[]]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Choose a date."),
    amount: z.string().regex(/^\d+(\.\d+)?$/u, "Enter an amount."),
    currencyCode: z.string().min(1, "Choose a currency."),
    counterpartAccountId: z.string(),
    toCurrencyCode: z.string(),
    toAmount: z.string(),
    notes: z.string().max(2000),
  })
  .superRefine((value, ctx) => {
    const transfer = value.kind === "transfer_in" || value.kind === "transfer_out";
    if (transfer && !value.counterpartAccountId) {
      ctx.addIssue({
        code: "custom",
        path: ["counterpartAccountId"],
        message: "Choose the other account.",
      });
    }
    if (value.kind === "fx_conversion") {
      if (!value.toCurrencyCode)
        ctx.addIssue({ code: "custom", path: ["toCurrencyCode"], message: "Choose a currency." });
      if (!value.toAmount)
        ctx.addIssue({ code: "custom", path: ["toAmount"], message: "Enter the amount received." });
    }
  });
type Values = z.infer<typeof schema>;

/** Move money in and out of an investment account, between your accounts or between currencies. */
export function CashMovementForm({
  accountId,
  onCancel,
  onSuccess,
}: {
  accountId?: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const accounts = useInvestmentAccountsQuery();
  const others = useAccountsQuery({});
  const currencies = useCurrencyOptions();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      accountId: accountId ?? "",
      kind: "deposit",
      date: todayISODate(),
      amount: "",
      currencyCode: "",
      counterpartAccountId: "",
      toCurrencyCode: "",
      toAmount: "",
      notes: "",
    },
  });
  const kind = form.watch("kind");
  const mutation = useAddCashMovementMutation({
    successToast: { title: "Cash movement recorded" },
    onSuccess,
  });
  const selected = accounts.data?.find((item) => item.id === form.watch("accountId"));
  const currencyCode = form.watch("currencyCode") || selected?.currencyCode || "";
  const precision = 2;

  const onSubmit = form.handleSubmit((values) => {
    mutation.reset();
    mutation.mutate({
      id: values.accountId,
      body: {
        kind: values.kind as (typeof KINDS)[number]["value"],
        date: values.date,
        amount: values.amount,
        currencyCode: values.currencyCode || selected?.currencyCode || "",
        ...(values.counterpartAccountId
          ? { counterpartAccountId: values.counterpartAccountId }
          : {}),
        ...(values.kind === "fx_conversion"
          ? { toCurrencyCode: values.toCurrencyCode, toAmount: values.toAmount }
          : {}),
        notes: values.notes.trim() || null,
      },
    });
  });

  const transfer = kind === "transfer_in" || kind === "transfer_out";

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <FormItem
        type="select"
        control={form.control}
        name="accountId"
        label="Investment account"
        placeholder="Choose an account"
        options={(accounts.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
        disabled={mutation.isPending}
      />
      <FormItem
        type="select"
        control={form.control}
        name="kind"
        label="Type"
        options={KINDS}
        disabled={mutation.isPending}
      />
      {transfer ? (
        <FormItem
          type="select"
          control={form.control}
          name="counterpartAccountId"
          label="Other account"
          description="Creates a matching transfer in that account."
          placeholder="Checking, savings..."
          options={(others.data?.data ?? [])
            .filter((item) => item.type !== "investment")
            .map((item) => ({ value: item.id, label: item.name }))}
          disabled={mutation.isPending}
        />
      ) : null}
      <ExactDateField
        control={form.control}
        name="date"
        label="Date"
        disabled={mutation.isPending}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <ExactNumberField
          control={form.control}
          name="amount"
          kind="money"
          precision={precision}
          label={kind === "fx_conversion" ? "Amount sold" : "Amount"}
          disabled={mutation.isPending}
        />
        <FormItem
          type="select"
          control={form.control}
          name="currencyCode"
          label="Currency"
          placeholder={selected?.currencyCode ?? "Account currency"}
          options={currencies}
          disabled={mutation.isPending}
        />
      </div>
      {kind === "fx_conversion" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <ExactNumberField
            control={form.control}
            name="toAmount"
            kind="money"
            label="Amount received"
            disabled={mutation.isPending}
          />
          <FormItem
            type="select"
            control={form.control}
            name="toCurrencyCode"
            label="Received currency"
            options={currencies.filter((item) => item.value !== currencyCode)}
            disabled={mutation.isPending}
          />
        </div>
      ) : null}
      <FormItem
        type="textarea"
        control={form.control}
        name="notes"
        label="Notes"
        placeholder="Optional"
        rows={2}
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
          Record movement
        </Button>
      </div>
    </form>
  );
}
