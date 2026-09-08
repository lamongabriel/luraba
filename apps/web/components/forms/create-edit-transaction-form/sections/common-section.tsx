import type { Control } from "react-hook-form";

import { FormItem } from "@/components/forms/form-item";

import type { CreateEditTransactionFormValues } from "../create-edit-transaction-form.schema";
import { TRANSACTION_KIND_OPTIONS } from "../create-edit-transaction-form.utils";
import { TransactionFormSection } from "./transaction-form-section";

export function CommonSection({
  control,
  isEdit,
  paymentDateLabel,
}: {
  control: Control<CreateEditTransactionFormValues>;
  isEdit: boolean;
  paymentDateLabel?: boolean;
}) {
  return (
    <TransactionFormSection title="Overview">
      <FormItem
        type="select"
        control={control}
        name="kind"
        label="Transaction type"
        options={TRANSACTION_KIND_OPTIONS}
        disabled={isEdit}
        description={isEdit ? "Transaction type cannot change after creation." : undefined}
      />
      <FormItem
        control={control}
        name="description"
        label="Description"
        placeholder="What was this transaction for?"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormItem
          control={control}
          name="purchaseDate"
          label={paymentDateLabel ? "Payment date" : "Purchase date"}
          inputType="date"
        />
        <FormItem control={control} name="postedDate" label="Posted date" inputType="date" />
      </div>
    </TransactionFormSection>
  );
}
