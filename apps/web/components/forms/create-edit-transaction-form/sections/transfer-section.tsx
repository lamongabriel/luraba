import { Exchange01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { AccountSummary, CurrencyRate } from "@luraba/contracts";
import { type Control, Controller } from "react-hook-form";
import { FormItem } from "@/components/forms/form-item";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";

import type { CreateEditTransactionFormValues } from "../create-edit-transaction-form.schema";
import { TransactionFormSection } from "./transaction-form-section";

export function TransferSection({
  accounts,
  control,
  fromCurrencyCode,
  isCrossCurrency,
  isRateError,
  isRateFetching,
  onUseMarketRate,
  onUseCustomAmount,
  rate,
  toCurrencyCode,
  usesMarketRate,
}: {
  accounts: AccountSummary[];
  control: Control<CreateEditTransactionFormValues>;
  fromCurrencyCode?: string;
  isCrossCurrency: boolean;
  isRateError: boolean;
  isRateFetching: boolean;
  onUseMarketRate: () => void;
  onUseCustomAmount: () => void;
  rate?: CurrencyRate;
  toCurrencyCode?: string;
  usesMarketRate: boolean;
}) {
  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: account.name,
    description: account.currencyCode,
  }));

  return (
    <TransactionFormSection
      title="Transfer"
      description="Move money between two accounts and confirm the exact amount received."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FormItem
          type="combobox"
          control={control}
          name="fromAccountId"
          label="From account"
          options={accountOptions}
          placeholder="Choose source"
        />
        <FormItem
          type="combobox"
          control={control}
          name="toAccountId"
          label="To account"
          options={accountOptions}
          placeholder="Choose destination"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormItem
          control={control}
          name="amount"
          label={`Sent amount${fromCurrencyCode ? ` (${fromCurrencyCode})` : ""}`}
          inputType="number"
          step="any"
          placeholder="0.00"
        />
        <Controller
          control={control}
          name="toAmount"
          render={({ field, fieldState }) => (
            <Field data-invalid={Boolean(fieldState.error)}>
              <FieldLabel htmlFor="toAmount">
                Received amount
                {toCurrencyCode ? ` (${toCurrencyCode})` : ""}
              </FieldLabel>
              <Input
                id="toAmount"
                type="number"
                step="any"
                value={field.value}
                placeholder="0.00"
                aria-invalid={Boolean(fieldState.error)}
                onBlur={field.onBlur}
                onChange={(event) => {
                  const value = event.target.value;
                  field.onChange(value === "" ? "" : Number(value));
                  if (isCrossCurrency) onUseCustomAmount();
                }}
              />
              <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
            </Field>
          )}
        />
      </div>

      {fromCurrencyCode && toCurrencyCode ? (
        <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-[var(--color-container-inset)] px-3 py-3">
          <HugeiconsIcon
            icon={Exchange01Icon}
            strokeWidth={2}
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <div className="min-w-0 flex-1 space-y-1">
            {isCrossCurrency ? (
              <>
                <Typography variant="small-strong">
                  {usesMarketRate ? "Market rate" : "Custom destination amount"}
                </Typography>
                <Typography variant="small-muted">
                  {isRateFetching
                    ? "Fetching the rate for this transfer date..."
                    : rate
                      ? `1 ${rate.fromCurrency.code} = ${rate.rate} ${rate.toCurrency.code} · ${rate.provider} · ${rate.rateDate}`
                      : isRateError
                        ? "The market quote is unavailable. You can enter both amounts manually."
                        : "Enter the source amount to request a market quote."}
                </Typography>
              </>
            ) : (
              <Typography variant="small-muted">
                Same-currency transfers keep the sent and received amounts equal.
              </Typography>
            )}
          </div>
          {isCrossCurrency && !usesMarketRate ? (
            <Button type="button" size="sm" variant="outline" onClick={onUseMarketRate}>
              <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
              Use market rate
            </Button>
          ) : null}
        </div>
      ) : null}
    </TransactionFormSection>
  );
}
