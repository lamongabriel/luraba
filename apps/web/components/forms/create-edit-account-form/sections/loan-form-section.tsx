"use client";

import { loanDueDate } from "@luraba/domain";
import * as React from "react";
import { useWatch } from "react-hook-form";

import { FormItem } from "@/components/forms/form-item";
import { Typography } from "@/components/ui/typography";
import { INTEREST_RATE_TYPE_OPTIONS, PAYMENT_FREQUENCY_OPTIONS } from "@/lib/accounts";
import { useAccountsQuery } from "@/queries/accounts/use-accounts-query";

import type { CreateEditAccountSectionProps } from "./create-edit-account-section.types";

const MAX_TERM_MONTHS = 1200;

/**
 * Loan details in the order people think about them: what was borrowed, how it is repaid, when it
 * runs and what secures it. Maturity follows start date plus term until the user picks their own.
 */
export function LoanFormSection({ disabled, form }: CreateEditAccountSectionProps) {
  const assetAccounts = useAccountsQuery(
    { classifications: ["asset"], perPage: 100 },
    { enabled: !disabled },
  );
  const [startDate, termMonths] = useWatch({
    control: form.control,
    name: ["startDate", "termMonths"],
  });
  const maturityEdited = React.useRef(Boolean(form.getValues("maturityDate")));

  React.useEffect(() => {
    if (maturityEdited.current) return;
    if (typeof termMonths !== "number" || !startDate) return;
    form.setValue("maturityDate", loanDueDate(startDate, "monthly", termMonths), {
      shouldDirty: true,
    });
  }, [form, startDate, termMonths]);

  return (
    <div className="space-y-5">
      <fieldset className="space-y-3">
        <Typography variant="small-strong">Loan terms</Typography>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormItem
            control={form.control}
            name="originalPrincipal"
            label="Original principal"
            inputType="money"
            description="The amount borrowed."
            disabled={disabled}
          />
          <FormItem
            control={form.control}
            name="annualInterestRate"
            label="Annual interest rate"
            inputType="decimal"
            decimals={2}
            max={100}
            suffix="%"
            placeholder="0.00"
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
            control={form.control}
            name="termMonths"
            label="Term"
            inputType="integer"
            max={MAX_TERM_MONTHS}
            suffix="months"
            placeholder="360"
            disabled={disabled}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <Typography variant="small-strong">Payments</Typography>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormItem
            control={form.control}
            name="paymentAmount"
            label="Payment amount"
            inputType="money"
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
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <Typography variant="small-strong">Schedule</Typography>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormItem
            control={form.control}
            name="startDate"
            label="Start date"
            inputType="date"
            description="Payments are counted from this day."
            disabled={disabled}
          />
          <div
            onChangeCapture={() => {
              maturityEdited.current = true;
            }}
            onClickCapture={() => {
              maturityEdited.current = true;
            }}
          >
            <FormItem
              control={form.control}
              name="maturityDate"
              label="Maturity date"
              inputType="date"
              description="Fills in from the start date and term."
              disabled={disabled}
            />
          </div>
        </div>
      </fieldset>

      <FormItem
        type="select"
        control={form.control}
        name="securedAssetAccountId"
        label="Secured by"
        placeholder="Nothing (unsecured)"
        description="The property or vehicle this loan is backed by."
        disabled={disabled || assetAccounts.isPending}
        options={
          assetAccounts.data?.data.map((account) => ({
            value: account.id,
            label: account.name,
          })) ?? []
        }
      />
    </div>
  );
}
