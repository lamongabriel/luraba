import type { AccountSummary, Merchant, PaymentMethod } from "@luraba/contracts";
import type { Control } from "react-hook-form";
import { AccountSelect } from "@/components/display";
import { FormItem } from "@/components/forms/form-item";

import type {
  CreateEditTransactionFormValues,
  TransactionFormKind,
} from "../create-edit-transaction-form.schema";
import { ClassificationFields } from "./classification-fields";
import { TransactionFormSection } from "./transaction-form-section";

export function ExpenseIncomeSection({
  accounts,
  control,
  kind,
  merchants,
  paymentMethods,
}: {
  accounts: AccountSummary[];
  control: Control<CreateEditTransactionFormValues>;
  kind: Extract<TransactionFormKind, "expense" | "income">;
  merchants: Merchant[];
  paymentMethods: PaymentMethod[];
}) {
  const paymentMethodOptions = paymentMethods.map((method) => ({
    value: method.code,
    label: method.name,
  }));

  return (
    <TransactionFormSection title={kind === "income" ? "Income" : "Expense"}>
      <AccountSelect
        control={control}
        name="accountId"
        label="Account"
        accounts={accounts}
        placeholder="Choose an account"
      />
      <FormItem
        control={control}
        name="amount"
        label="Amount"
        inputType="money"
        placeholder="0.00"
      />
      <ClassificationFields categoryType={kind} control={control} merchants={merchants} />
      <FormItem
        type="combobox"
        control={control}
        name="paymentMethodCode"
        label="Payment method"
        options={paymentMethodOptions}
        placeholder="Choose a payment method"
      />
    </TransactionFormSection>
  );
}
