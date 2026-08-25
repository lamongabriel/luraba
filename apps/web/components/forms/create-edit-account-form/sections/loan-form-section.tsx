"use client"

import { FormItem } from "@/components/forms/form-item"
import {
  INTEREST_RATE_TYPE_OPTIONS,
  PAYMENT_FREQUENCY_OPTIONS,
} from "@/lib/accounts"
import { useAccountsQuery } from "@/queries/accounts/use-accounts-query"

import type { CreateEditAccountSectionProps } from "./create-edit-account-section.types"

export function LoanFormSection({
  disabled,
  form,
}: CreateEditAccountSectionProps) {
  const assetAccounts = useAccountsQuery(
    { classifications: ["asset"], perPage: 100 },
    { enabled: !disabled },
  )

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormItem
        control={form.control}
        name="originalPrincipal"
        label="Original principal"
        inputType="number"
        step="0.01"
        disabled={disabled}
      />
      <FormItem
        control={form.control}
        name="annualInterestRate"
        label="Annual interest rate"
        inputType="number"
        step="0.0001"
        disabled={disabled}
      />
      <FormItem
        type="select"
        control={form.control}
        name="interestRateType"
        label="Rate type"
        placeholder="Not specified"
        disabled={disabled}
        options={INTEREST_RATE_TYPE_OPTIONS}
      />
      <FormItem
        type="int"
        control={form.control}
        name="termMonths"
        label="Term in months"
        disabled={disabled}
      />
      <FormItem
        control={form.control}
        name="startDate"
        label="Start date"
        inputType="date"
        disabled={disabled}
      />
      <FormItem
        control={form.control}
        name="maturityDate"
        label="Maturity date"
        inputType="date"
        disabled={disabled}
      />
      <FormItem
        control={form.control}
        name="paymentAmount"
        label="Payment amount"
        inputType="number"
        step="0.01"
        disabled={disabled}
      />
      <FormItem
        type="select"
        control={form.control}
        name="paymentFrequency"
        label="Payment frequency"
        placeholder="Not specified"
        disabled={disabled}
        options={PAYMENT_FREQUENCY_OPTIONS}
      />
      <FormItem
        type="select"
        control={form.control}
        name="securedAssetAccountId"
        label="Secured asset"
        placeholder="None"
        disabled={disabled || assetAccounts.isPending}
        options={
          assetAccounts.data?.data.map((account) => ({
            value: account.id,
            label: account.name,
          })) ?? []
        }
      />
    </div>
  )
}
