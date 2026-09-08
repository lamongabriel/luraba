import type { AccountSummary, CreditCard } from "@luraba/contracts";
import type { Control } from "react-hook-form";
import { FormItem } from "@/components/forms/form-item";

import type { CreateEditTransactionFormValues } from "../create-edit-transaction-form.schema";
import { TransactionFormSection } from "./transaction-form-section";

export function CreditCardPaymentSection({
  accounts,
  cards,
  control,
  isEdit,
}: {
  accounts: AccountSummary[];
  cards: CreditCard[];
  control: Control<CreateEditTransactionFormValues>;
  isEdit: boolean;
}) {
  const cardOptions = cards.map((card) => ({
    value: card.id,
    label: card.name,
    description: `${card.brand} · •••• ${card.last4} · ${card.currencyCode}`,
  }));
  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: account.name,
    description: account.currencyCode,
  }));

  return (
    <TransactionFormSection title="Credit card payment">
      <FormItem
        type="combobox"
        control={control}
        name="creditCardId"
        label="Credit card"
        options={cardOptions}
        placeholder="Choose a card"
        disabled={isEdit}
        description={isEdit ? "The payment card cannot be changed." : undefined}
      />
      <FormItem
        type="combobox"
        control={control}
        name="fromAccountId"
        label="Source account"
        options={accountOptions}
        placeholder="Choose an asset account"
      />
      <FormItem
        control={control}
        name="amount"
        label="Payment amount"
        inputType="number"
        step="any"
        placeholder="0.00"
      />
    </TransactionFormSection>
  );
}
