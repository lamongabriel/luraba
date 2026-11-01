import type { AccountSummary, CreditCard } from "@luraba/contracts";
import type { Control } from "react-hook-form";
import { AccountSelect } from "@/components/display";
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
  return (
    <TransactionFormSection title="Credit card payment">
      <AccountSelect
        control={control}
        name="creditCardId"
        label="Credit card"
        accounts={cards}
        placeholder="Choose a card"
        disabled={isEdit}
        description={isEdit ? "The payment card cannot be changed." : undefined}
      />
      <AccountSelect
        control={control}
        name="fromAccountId"
        label="Source account"
        accounts={accounts}
        placeholder="Choose an asset account"
      />
      <FormItem
        control={control}
        name="amount"
        label="Payment amount"
        inputType="money"
        placeholder="0.00"
      />
    </TransactionFormSection>
  );
}
