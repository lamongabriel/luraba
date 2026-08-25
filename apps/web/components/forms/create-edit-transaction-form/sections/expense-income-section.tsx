import type { Control } from "react-hook-form"

import { FormItem } from "@/components/forms/form-item"
import type { AccountSummary } from "@/interfaces/account"
import type { Merchant } from "@/interfaces/merchant"
import type { PaymentMethod } from "@/interfaces/payment-method"

import type {
  CreateEditTransactionFormValues,
  TransactionFormKind,
} from "../create-edit-transaction-form.schema"
import { OptionalMerchantField } from "./optional-merchant-field"
import { TransactionFormSection } from "./transaction-form-section"

export function ExpenseIncomeSection({
  accounts,
  control,
  kind,
  merchants,
  paymentMethods,
}: {
  accounts: AccountSummary[]
  control: Control<CreateEditTransactionFormValues>
  kind: Extract<TransactionFormKind, "expense" | "income">
  merchants: Merchant[]
  paymentMethods: PaymentMethod[]
}) {
  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: account.name,
    description: account.currencyCode,
  }))
  const paymentMethodOptions = paymentMethods.map((method) => ({
    value: method.code,
    label: method.name,
    description: method.currencyCode ?? "All currencies",
  }))

  return (
    <TransactionFormSection title={kind === "income" ? "Income" : "Expense"}>
      <FormItem
        type="combobox"
        control={control}
        name="accountId"
        label="Account"
        options={accountOptions}
        placeholder="Choose an account"
      />
      <FormItem
        control={control}
        name="amount"
        label="Amount"
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
          categoryType={kind}
          placeholder="Choose a category"
        />
        <OptionalMerchantField control={control} merchants={merchants} />
      </div>
      <FormItem
        type="combobox"
        control={control}
        name="paymentMethodCode"
        label="Payment method"
        options={paymentMethodOptions}
        placeholder="Choose a payment method"
      />
    </TransactionFormSection>
  )
}
