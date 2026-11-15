"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreatePiggyBankInput,
  defaultPiggyDayCount,
  PIGGY_BANK_COVER_PRESETS,
  type PiggyBankCoverPreset,
  type PiggyBankDetail,
  type UpdatePiggyBankInput,
} from "@luraba/contracts";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AccountSelect, PIGGY_BANK_COVER_DISPLAY, PiggyBankMark } from "@/components/display";
import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { FormItem } from "@/components/forms/form-item";
import { FormSheet } from "@/components/forms/form-sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Typography } from "@/components/ui/typography";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { majorToMinorUnits } from "@/lib/finance";
import { cn } from "@/lib/utils";
import {
  useCreatePiggyBankMutation,
  useUpdatePiggyBankMutation,
} from "@/mutations/piggy-banks/use-piggy-bank-mutations";
import { useAccountsQuery } from "@/queries/accounts/use-accounts-query";

const YIELD_OPTIONS = [
  { value: "none", label: "No yield" },
  { value: "cdi_percent", label: "% of CDI" },
  { value: "selic_percent", label: "% of Selic" },
  { value: "ipca_plus", label: "IPCA + rate" },
  { value: "fixed_rate", label: "Fixed rate (per year)" },
];
const LIQUIDITY_OPTIONS = [
  { value: "daily", label: "Daily liquidity" },
  { value: "at_maturity", label: "Only at maturity" },
];
const TAX_OPTIONS = [
  { value: "none", label: "No tax" },
  { value: "regressive_ir", label: "Regressive income tax" },
];
const RATE_LABEL: Record<string, string> = {
  cdi_percent: "Percent of CDI",
  selic_percent: "Percent of Selic",
  ipca_plus: "Rate above IPCA (% a year)",
  fixed_rate: "Rate (% a year)",
};

const numberField = z.union([z.number(), z.literal("")]);
const schema = z.object({
  title: z.string().trim().min(1, "Enter a name.").max(255),
  parentAccountId: z.string().min(1, "Choose the account it sits in."),
  description: z.string(),
  coverPreset: z.string(),
  emoji: z.string().max(16),
  yieldType: z.enum(["none", "cdi_percent", "selic_percent", "ipca_plus", "fixed_rate"]),
  yieldRate: numberField,
  maturityDate: z.string(),
  liquidity: z.enum(["daily", "at_maturity"]),
  taxRegime: z.enum(["none", "regressive_ir"]),
  applyIof: z.boolean(),
  initialBalance: numberField,
});
type Values = z.infer<typeof schema>;

/** Preset covers as a row of tiles; the selected one is outlined. Clearing the choice falls back to the piggy icon. */
function CoverPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>Cover</Label>
      <div className="flex flex-wrap gap-2">
        {PIGGY_BANK_COVER_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            aria-label={PIGGY_BANK_COVER_DISPLAY[preset].label}
            aria-pressed={value === preset}
            title={PIGGY_BANK_COVER_DISPLAY[preset].label}
            onClick={() => onChange(value === preset ? "" : preset)}
            className={cn(
              "rounded-lg p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              value === preset && "ring-2 ring-primary",
            )}
          >
            <PiggyBankMark piggyBank={{ coverPreset: preset as PiggyBankCoverPreset }} size="lg" />
          </button>
        ))}
      </div>
    </div>
  );
}

function PiggyBankForm({
  piggyBank,
  defaultAccountId,
  onCancel,
  onSuccess,
}: {
  piggyBank?: PiggyBankDetail;
  defaultAccountId?: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const accounts = useAccountsQuery({ perPage: 200 });
  const cashAccounts = (accounts.data?.data ?? []).filter(
    (account) => account.type === "cash" && !account.archivedAt,
  );
  const precisionOf = useCurrencyPrecision();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: piggyBank?.title ?? "",
      parentAccountId: piggyBank?.parentAccountId ?? defaultAccountId ?? "",
      description: piggyBank?.description ?? "",
      coverPreset: piggyBank?.coverPreset ?? "",
      emoji: piggyBank?.emoji ?? "",
      yieldType: piggyBank?.yield.type ?? "none",
      yieldRate: piggyBank && piggyBank.yield.type !== "none" ? piggyBank.yield.rate : "",
      maturityDate: piggyBank?.yield.maturityDate ?? "",
      liquidity: piggyBank?.yield.liquidity ?? "daily",
      taxRegime: piggyBank?.yield.taxRegime ?? "none",
      applyIof: piggyBank?.yield.applyIof ?? false,
      initialBalance: "",
    },
  });
  const create = useCreatePiggyBankMutation({
    onSuccess,
    successToast: { title: "Piggy bank created" },
  });
  const update = useUpdatePiggyBankMutation({
    onSuccess,
    successToast: { title: "Piggy bank updated" },
  });
  const pending = create.isPending || update.isPending;
  const errorMessage = create.errorMessage || update.errorMessage;
  const yieldType = form.watch("yieldType");
  const taxRegime = form.watch("taxRegime");
  const coverPreset = form.watch("coverPreset");
  const parentId = form.watch("parentAccountId");
  const currency =
    piggyBank?.currencyCode ??
    cashAccounts.find((account) => account.id === parentId)?.currencyCode ??
    "USD";

  const onSubmit = form.handleSubmit((values) => {
    const rate = values.yieldRate === "" ? 0 : values.yieldRate;
    const yieldConfig =
      values.yieldType === "none"
        ? { type: "none" as const, rate: 0 }
        : {
            type: values.yieldType,
            rate,
            dayCount: defaultPiggyDayCount(values.yieldType),
            maturityDate: values.maturityDate || null,
            liquidity: values.liquidity,
            taxRegime: values.taxRegime,
            applyIof: values.taxRegime === "regressive_ir" && values.applyIof,
          };
    const shared = {
      title: values.title.trim(),
      description: values.description.trim() || null,
      coverPreset: (values.coverPreset || null) as PiggyBankCoverPreset | null,
      emoji: values.emoji.trim() || null,
      yield: yieldConfig,
    };
    if (piggyBank) {
      update.reset();
      update.mutate({ id: piggyBank.id, body: shared as UpdatePiggyBankInput });
      return;
    }
    create.reset();
    create.mutate({
      ...shared,
      parentAccountId: values.parentAccountId,
      ...(values.initialBalance !== ""
        ? {
            initialBalance: majorToMinorUnits(values.initialBalance, precisionOf(currency)),
          }
        : {}),
    } as CreatePiggyBankInput);
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <div className="flex items-end gap-3">
        <PiggyBankMark
          piggyBank={{
            coverUploadId: piggyBank?.coverUploadId,
            coverPreset: (coverPreset || null) as PiggyBankCoverPreset | null,
            emoji: form.watch("emoji") || null,
          }}
          size="lg"
        />
        <FormItem
          control={form.control}
          name="title"
          label="Name"
          placeholder="Emergency fund"
          className="flex-1"
          disabled={pending}
        />
      </div>
      {piggyBank ? null : (
        <AccountSelect
          control={form.control}
          name="parentAccountId"
          label="Account it sits in"
          accounts={cashAccounts}
          description="Piggy banks are parts of one account's balance."
          disabled={pending}
        />
      )}
      <CoverPicker
        value={coverPreset}
        onChange={(value) => form.setValue("coverPreset", value)}
        disabled={pending}
      />
      <FormItem
        control={form.control}
        name="emoji"
        label="Emoji (optional)"
        placeholder="🛟"
        description="Shown instead of the cover icon."
        disabled={pending}
      />
      <FormItem
        control={form.control}
        name="yieldType"
        label="How it earns"
        type="select"
        options={YIELD_OPTIONS}
        disabled={pending}
      />
      {yieldType === "none" ? null : (
        <>
          <FormItem
            control={form.control}
            name="yieldRate"
            label={RATE_LABEL[yieldType] ?? "Rate"}
            inputType="decimal"
            decimals={4}
            suffix="%"
            description="Interest is credited every business day and marked as an estimate until you set the real balance."
            disabled={pending}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormItem
              control={form.control}
              name="maturityDate"
              label="Maturity (optional)"
              inputType="date"
              disabled={pending}
            />
            <FormItem
              control={form.control}
              name="liquidity"
              label="Liquidity"
              type="select"
              options={LIQUIDITY_OPTIONS}
              disabled={pending}
            />
          </div>
          <FormItem
            control={form.control}
            name="taxRegime"
            label="Taxes"
            type="select"
            options={TAX_OPTIONS}
            description="Used for the “if withdrawn today” figure."
            disabled={pending}
          />
          {taxRegime === "regressive_ir" ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5">
              <div className="min-w-0">
                <Label htmlFor="piggy-iof">Apply IOF</Label>
                <Typography variant="small-muted">
                  Charged on withdrawals in the first 30 days.
                </Typography>
              </div>
              <Switch
                id="piggy-iof"
                checked={form.watch("applyIof")}
                onCheckedChange={(checked) => form.setValue("applyIof", checked)}
                disabled={pending}
              />
            </div>
          ) : null}
        </>
      )}
      {piggyBank ? null : (
        <FormItem
          control={form.control}
          name="initialBalance"
          label="Start with (optional)"
          inputType="money"
          precision={precisionOf(currency)}
          description="Taken from the account's free balance; no transfer is made."
          disabled={pending}
        />
      )}
      <FormItem
        control={form.control}
        name="description"
        label="Notes"
        type="textarea"
        rows={2}
        disabled={pending}
      />

      {errorMessage ? <Typography variant="small-destructive">{errorMessage}</Typography> : null}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={pending} loadingText="Saving...">
          {piggyBank ? "Save changes" : "Create piggy bank"}
        </Button>
      </div>
    </form>
  );
}

export function PiggyBankSheet({
  open,
  onOpenChange,
  piggyBank,
  defaultAccountId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  piggyBank?: PiggyBankDetail;
  defaultAccountId?: string;
}) {
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={piggyBank ? "Edit piggy bank" : "New piggy bank"}
      description={
        piggyBank
          ? "Change its look or how it earns. Interest already credited is not rewritten."
          : "A named part of an account's balance that can earn interest and count toward goals."
      }
    >
      <FormErrorBoundary>
        <PiggyBankForm
          key={`${piggyBank?.id ?? "new"}-${open}`}
          piggyBank={piggyBank}
          defaultAccountId={defaultAccountId}
          onCancel={close}
          onSuccess={close}
        />
      </FormErrorBoundary>
    </FormSheet>
  );
}
