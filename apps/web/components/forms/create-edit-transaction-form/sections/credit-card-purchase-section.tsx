import { CreditCardIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CreditCard, Merchant } from "@luraba/contracts";
import type { Control } from "react-hook-form";
import { FormItem } from "@/components/forms/form-item";
import { Typography } from "@/components/ui/typography";

import type { CreateEditTransactionFormValues } from "../create-edit-transaction-form.schema";
import { OptionalMerchantField } from "./optional-merchant-field";
import { TransactionFormSection } from "./transaction-form-section";

export function CreditCardPurchaseSection({
  cards,
  control,
  isEdit,
  merchants,
}: {
  cards: CreditCard[];
  control: Control<CreateEditTransactionFormValues>;
  isEdit: boolean;
  merchants: Merchant[];
}) {
  const cardOptions = cards.map((card) => ({
    value: card.id,
    label: card.name,
    description: `${card.brand} · •••• ${card.last4} · ${card.currencyCode}`,
  }));

  return (
    <TransactionFormSection title="Credit card purchase">
      <FormItem
        type="combobox"
        control={control}
        name="creditCardId"
        label="Credit card"
        options={cardOptions}
        placeholder="Choose a card"
        disabled={isEdit}
        description={isEdit ? "The purchase card cannot be changed." : undefined}
      />
      <FormItem
        control={control}
        name="amount"
        label="Purchase amount"
        inputType="number"
        step="any"
        placeholder="0.00"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormItem
          type="category"
          control={control}
          name="categoryId"
          label="Category"
          categoryType="expense"
          placeholder="Choose a category"
        />
        <OptionalMerchantField control={control} merchants={merchants} />
      </div>
      <FormItem
        type="int"
        control={control}
        name="installmentCount"
        label="Installments"
        placeholder="1"
      />
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
