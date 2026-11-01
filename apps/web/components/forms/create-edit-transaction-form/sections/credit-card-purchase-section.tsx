import { CreditCardIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CreditCard, Merchant } from "@luraba/contracts";
import { type Control, useWatch } from "react-hook-form";
import { AccountSelect } from "@/components/display";
import { FormItem } from "@/components/forms/form-item";
import { Typography } from "@/components/ui/typography";
import { describeInstallments, INSTALLMENT_COUNT_OPTIONS } from "@/lib/installments";

import type { CreateEditTransactionFormValues } from "../create-edit-transaction-form.schema";
import { ClassificationFields } from "./classification-fields";
import { TransactionFormSection } from "./transaction-form-section";

export function CreditCardPurchaseSection({
  cards,
  control,
  currencyCode,
  isEdit,
  language,
  merchants,
  precision,
}: {
  cards: CreditCard[];
  control: Control<CreateEditTransactionFormValues>;
  currencyCode?: string;
  isEdit: boolean;
  language: string;
  merchants: Merchant[];
  precision: number;
}) {
  const amount = useWatch({ control, name: "amount" });
  const installmentCount = useWatch({ control, name: "installmentCount" });
  const totalMinor = Math.round((Number(amount) || 0) * 10 ** precision);
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
        />
        <FormItem
          type="select"
          control={control}
          name="installmentCount"
          label="Installments"
          options={countOptions}
          parseValue={Number}
          description={preview || undefined}
        />
      </div>
      <ClassificationFields categoryType="expense" control={control} merchants={merchants} />
      {isEdit ? (
        <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-[var(--color-container-inset)] px-3 py-3">
          <HugeiconsIcon
            icon={CreditCardIcon}
            strokeWidth={2}
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <Typography variant="small-muted">
            Saving rebuilds the complete installment schedule. Every installment of this purchase is
            affected.
          </Typography>
        </div>
      ) : null}
    </TransactionFormSection>
  );
}
