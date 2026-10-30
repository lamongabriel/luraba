"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { InvestmentAccount } from "@luraba/contracts";
import { COST_BASIS_METHODS, TAX_PROFILES } from "@luraba/contracts";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { FormItem } from "@/components/forms/form-item";
import { COST_BASIS_LABELS, TAX_PROFILE_LABELS } from "@/components/investments/constants";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Typography } from "@/components/ui/typography";
import {
  useCreateInvestmentAccountMutation,
  useUpdateInvestmentAccountSettingsMutation,
} from "@/mutations/investments/use-investments-mutations";
import {
  useInvestmentSettingsQuery,
  usePortfoliosQuery,
} from "@/queries/investments/use-investments-queries";

import { useCurrencyOptions } from "./use-currency-options";

const NO_PORTFOLIO = "none";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(255),
  broker: z.string().trim().max(255),
  country: z.string().trim().length(2, "Use a 2-letter country code, like US."),
  currencyCode: z.string().min(1, "Choose a currency."),
  costBasisMethod: z.enum(COST_BASIS_METHODS),
  taxProfile: z.enum(TAX_PROFILES),
  autoCreditIncome: z.boolean(),
  portfolioId: z.string(),
});
type Values = z.infer<typeof schema>;

/** Create an investment account, or change the settings of an existing one. */
export function AccountForm({
  account,
  onCancel,
  onSuccess,
}: {
  account?: InvestmentAccount;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const settings = useInvestmentSettingsQuery();
  const portfolios = usePortfoliosQuery();
  const currencies = useCurrencyOptions();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: account?.name ?? "",
      broker: account?.broker ?? "",
      country: account?.country ?? "US",
      currencyCode: account?.currencyCode ?? settings.data?.reportingCurrencyCode ?? "",
      costBasisMethod:
        account?.costBasisMethod ?? settings.data?.defaultCostBasisMethod ?? "AVERAGE",
      taxProfile: account?.taxProfile ?? settings.data?.defaultTaxProfile ?? "NONE",
      autoCreditIncome: account?.autoCreditIncome ?? true,
      portfolioId: account?.portfolioId ?? NO_PORTFOLIO,
    },
  });
  const create = useCreateInvestmentAccountMutation({
    successToast: { title: "Account created" },
    onSuccess,
  });
  const update = useUpdateInvestmentAccountSettingsMutation({
    successToast: { title: "Account updated" },
    onSuccess,
  });
  const isPending = create.isPending || update.isPending;
  const errorMessage = create.errorMessage || update.errorMessage;
  const isEdit = Boolean(account);

  const onSubmit = form.handleSubmit((values) => {
    const portfolioId = values.portfolioId === NO_PORTFOLIO ? null : values.portfolioId;
    const common = {
      broker: values.broker || null,
      country: values.country,
      costBasisMethod: values.costBasisMethod,
      taxProfile: values.taxProfile,
      autoCreditIncome: values.autoCreditIncome,
      portfolioId,
    };
    if (account) {
      update.reset();
      update.mutate({ id: account.id, body: common });
    } else {
      create.reset();
      create.mutate({ ...common, name: values.name, currencyCode: values.currencyCode });
    }
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      {!isEdit ? (
        <FormItem
          control={form.control}
          name="name"
          label="Name"
          placeholder="Brokerage account"
          disabled={isPending}
        />
      ) : null}
      <FormItem
        control={form.control}
        name="broker"
        label="Broker"
        placeholder="Charles Schwab"
        disabled={isPending}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormItem
          control={form.control}
          name="country"
          label="Country"
          placeholder="US"
          disabled={isPending}
        />
        <FormItem
          type="select"
          control={form.control}
          name="currencyCode"
          label="Base currency"
          description={isEdit ? "The base currency cannot change." : undefined}
          options={currencies}
          disabled={isPending || isEdit}
        />
      </div>
      <FormItem
        type="select"
        control={form.control}
        name="costBasisMethod"
        label="Cost basis method"
        description="How sales are matched to purchases."
        options={COST_BASIS_METHODS.map((value) => ({ value, label: COST_BASIS_LABELS[value] }))}
        disabled={isPending}
      />
      <FormItem
        type="select"
        control={form.control}
        name="taxProfile"
        label="Tax profile"
        description="Drives the tax estimates for this account."
        options={TAX_PROFILES.map((value) => ({ value, label: TAX_PROFILE_LABELS[value] }))}
        disabled={isPending}
      />
      <FormItem
        type="select"
        control={form.control}
        name="portfolioId"
        label="Portfolio"
        options={[
          { value: NO_PORTFOLIO, label: "No portfolio" },
          ...(portfolios.data ?? []).map((item) => ({ value: item.id, label: item.name })),
        ]}
        disabled={isPending}
      />
      <Controller
        name="autoCreditIncome"
        control={form.control}
        render={({ field }) => (
          <Field orientation="horizontal">
            <Switch
              id="autoCreditIncome"
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={isPending}
            />
            <div className="space-y-0.5">
              <FieldLabel htmlFor="autoCreditIncome">
                Credit income to cash automatically
              </FieldLabel>
              <FieldDescription>
                Dividends and interest add to the account's cash when recorded.
              </FieldDescription>
            </div>
          </Field>
        )}
      />
      {errorMessage ? <Typography variant="small-destructive">{errorMessage}</Typography> : null}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} loadingText="Saving...">
          {isEdit ? "Save changes" : "Create account"}
        </Button>
      </div>
    </form>
  );
}
