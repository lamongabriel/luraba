import { CreditCardIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CreditCard, Merchant } from "@luraba/contracts";
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
import { Switch } from "@/components/ui/switch";
import { Typography } from "@/components/ui/typography";
import {
  describeInstallments,
  INSTALLMENT_COUNT_OPTIONS,
  splitInstallments,
} from "@/lib/installments";

import type { CreateEditTransactionFormValues } from "../create-edit-transaction-form.schema";
import { ClassificationFields } from "./classification-fields";
import { TransactionFormSection } from "./transaction-form-section";

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
    ? describeInstallments(totalMinor, Number(installmentCount), currencyCode, language, precision)
    : "";
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
