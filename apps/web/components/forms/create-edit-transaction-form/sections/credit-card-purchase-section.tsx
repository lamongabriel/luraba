import { CreditCardIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CreditCard, Merchant } from "@luraba/contracts";
import { parseInstallmentPlanText } from "@luraba/domain";
import * as React from "react";
import {
  type Control,
  Controller,
  type UseFormGetValues,
  type UseFormSetValue,
  useWatch,
} from "react-hook-form";
import { AccountSelect } from "@/components/display";
import { FormItem } from "@/components/forms/form-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Typography } from "@/components/ui/typography";
import {
  describeInstallments,
  INSTALLMENT_COUNT_OPTIONS,
  splitInstallments,
} from "@/lib/installments";
import { useRoundingPatternsQuery } from "@/queries/credit-cards/use-credit-cards-query";

import type { CreateEditTransactionFormValues } from "../create-edit-transaction-form.schema";
import { ClassificationFields } from "./classification-fields";
import { TransactionFormSection } from "./transaction-form-section";

const ROUNDING_LABELS = {
  remainder_last: "last installment",
  remainder_first: "first installment",
  round_up_all: "rounded up, every installment",
  round_down_all: "rounded down, every installment",
} as const;

const ROUNDING_OPTIONS = [
  { value: "auto", label: "Card default" },
  { value: "remainder_last", label: "Last installment" },
  { value: "remainder_first", label: "First installment" },
  { value: "round_up_all", label: "Round every installment up" },
  { value: "round_down_all", label: "Round every installment down" },
];

export function CreditCardPurchaseSection({
  cards,
  control,
  getValues,
  setValue,
  currencyCode,
  isEdit,
  language,
  merchants,
  precision,
}: {
  cards: CreditCard[];
  control: Control<CreateEditTransactionFormValues>;
  getValues: UseFormGetValues<CreateEditTransactionFormValues>;
  setValue: UseFormSetValue<CreateEditTransactionFormValues>;
  currencyCode?: string;
  isEdit: boolean;
  language: string;
  merchants: Merchant[];
  precision: number;
}) {
  const amount = useWatch({ control, name: "amount" });
  const installmentCount = useWatch({ control, name: "installmentCount" });
  const custom = useWatch({ control, name: "customInstallments" });
  const installmentAmounts = useWatch({ control, name: "installmentAmounts" });
  const creditCardId = useWatch({ control, name: "creditCardId" });
  const roundingMode = useWatch({ control, name: "roundingMode" });
  const patterns = useRoundingPatternsQuery(creditCardId, { enabled: !custom });
  const learnedMode = patterns.data?.card?.roundingMode ?? null;
  const effectiveMode = roundingMode === "auto" ? (learnedMode ?? "remainder_last") : roundingMode;
  const [planText, setPlanText] = React.useState("");
  const [planError, setPlanError] = React.useState<string | null>(null);
  const totalMinor = Math.round((Number(amount) || 0) * 10 ** precision);
  const toMinor = (value: number | "") => Math.round((Number(value) || 0) * 10 ** precision);
  const toMajor = (minor: number) => minor / 10 ** precision;

  // With the list on, the count follows the rows and the total is their sum (the invoice amounts are the truth).
  // biome-ignore lint/correctness/useExhaustiveDependencies: the helpers only close over `precision`
  React.useEffect(() => {
    if (!custom) return;
    const rows = installmentAmounts ?? [];
    const count = Number(installmentCount) || 1;
    if (rows.length !== count) {
      const total = getValues("amount") === "" ? 0 : toMinor(getValues("amount"));
      const kept = rows.slice(0, count);
      const extra = splitInstallments(total, count).slice(kept.length);
      setValue("installmentAmounts", [...kept, ...extra.map((value) => toMajor(value))], {
        shouldDirty: true,
      });
      return;
    }
    const sum = rows.reduce<number>((acc, value) => acc + toMinor(value), 0);
    if (sum > 0 && sum !== totalMinor) setValue("amount", toMajor(sum), { shouldValidate: false });
  }, [custom, installmentAmounts, installmentCount, totalMinor]);

  const toggleCustom = (next: boolean) => {
    setValue("customInstallments", next, { shouldDirty: true });
    if (next) {
      const count = Number(installmentCount) || 1;
      setValue(
        "installmentAmounts",
        splitInstallments(totalMinor, count).map((value) => toMajor(value)),
        { shouldDirty: true },
      );
    }
  };
  const preview = currencyCode
    ? describeInstallments(
        totalMinor,
        Number(installmentCount),
        currencyCode,
        language,
        precision,
        effectiveMode,
      )
    : "";
  // "1st installment 364.90, rest 364.88" fills the exact list, like typing every row by hand.
  const applyPlanText = () => {
    const result = parseInstallmentPlanText(planText, Number(installmentCount) || undefined);
    if (!result.ok) return setPlanError(result.error);
    setPlanError(null);
    setValue("installmentCount", result.amounts.length, { shouldDirty: true });
    setValue(
      "installmentAmounts",
      result.amounts.map((value) => toMajor(value)),
      { shouldDirty: true },
    );
    setValue("customInstallments", true, { shouldDirty: true });
    setValue("amount", toMajor(result.amounts.reduce((sum, value) => sum + value, 0)), {
      shouldDirty: true,
    });
  };
  const countOptions = INSTALLMENT_COUNT_OPTIONS.some(
    (option) => option.value === String(installmentCount),
  )
    ? INSTALLMENT_COUNT_OPTIONS
    : [
        ...INSTALLMENT_COUNT_OPTIONS,
        { value: String(installmentCount), label: `${installmentCount}x` },
      ];

  return (
    <TransactionFormSection title="Credit card purchase">
      <AccountSelect
        control={control}
        name="creditCardId"
        label="Credit card"
        accounts={cards}
        placeholder="Choose a card"
        disabled={isEdit}
        description={isEdit ? "The purchase card cannot be changed." : undefined}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormItem
          control={control}
          name="amount"
          label="Purchase amount"
          inputType="money"
          precision={precision}
          placeholder="0.00"
          disabled={custom}
          description={custom ? "The sum of the installments below." : undefined}
        />
        <FormItem
          type="select"
          control={control}
          name="installmentCount"
          label="Installments"
          options={countOptions}
          parseValue={Number}
          description={custom ? undefined : preview || undefined}
        />
      </div>
      <Controller
        control={control}
        name="customInstallments"
        render={({ field }) => (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <label htmlFor={field.name} className="text-xs font-medium">
                Set each installment
              </label>
              <Typography variant="small-muted">
                Type the amounts exactly as the invoice shows them; stores and banks round
                differently.
              </Typography>
            </div>
            <Switch
              id={field.name}
              checked={field.value}
              onCheckedChange={toggleCustom}
              aria-label="Set each installment"
            />
          </div>
        )}
      />
      {!custom && Number(installmentCount) > 1 ? (
        <FormItem
          type="select"
          control={control}
          name="roundingMode"
          label="Extra cents go on"
          options={ROUNDING_OPTIONS.map((option) =>
            option.value === "auto"
              ? {
                  ...option,
                  label: learnedMode
                    ? `${option.label} (${ROUNDING_LABELS[learnedMode]}, learned)`
                    : `${option.label} (${ROUNDING_LABELS.remainder_last})`,
                }
              : option,
          )}
          description={
            learnedMode
              ? `Learned from this card's reconciled invoices (${patterns.data?.card?.samples} purchases). Change it for a store that rounds differently.`
              : undefined
          }
        />
      ) : null}
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <Input
            value={planText}
            onChange={(event) => setPlanText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              applyPlanText();
            }}
            placeholder="1st installment 364.90, rest 364.88"
            aria-label="Installment shorthand"
          />
          <Button
            type="button"
            variant="outline"
            onClick={applyPlanText}
            disabled={!planText.trim()}
          >
            Apply
          </Button>
        </div>
        {planError ? (
          <Typography variant="small-destructive">{planError}</Typography>
        ) : (
          <Typography variant="small-muted">
            Or type the invoice's amounts in one line, like the example.
          </Typography>
        )}
      </div>
      {custom ? (
        <div className="grid gap-3 sm:grid-cols-2" data-slot="installment-amounts">
          {(installmentAmounts ?? []).map((_, index) => (
            <FormItem
              // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional (installment number)
              key={index}
              control={control}
              name={`installmentAmounts.${index}`}
              label={`Installment ${index + 1}`}
              inputType="money"
              precision={precision}
              placeholder="0.00"
            />
          ))}
        </div>
      ) : null}
      <ClassificationFields categoryType="expense" control={control} merchants={merchants} />
      {isEdit ? (
        <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-[var(--color-container-inset)] px-3 py-3">
          <HugeiconsIcon
            icon={CreditCardIcon}
            strokeWidth={2}
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <Typography variant="small-muted">
            Saving keeps installments already on a closed invoice and lays out the rest again. Turn
            on "Set each installment" to change any amount, closed invoices included.
          </Typography>
        </div>
      ) : null}
    </TransactionFormSection>
  );
}
