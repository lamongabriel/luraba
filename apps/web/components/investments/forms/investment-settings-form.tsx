"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { InvestmentSettings } from "@luraba/contracts";
import { COST_BASIS_METHODS, TAX_PROFILES } from "@luraba/contracts";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CurrencySelect } from "@/components/display";
import { FormItem } from "@/components/forms/form-item";
import { COST_BASIS_LABELS, TAX_PROFILE_LABELS } from "@/components/investments/constants";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Typography } from "@/components/ui/typography";
import { useUpdateInvestmentSettingsMutation } from "@/mutations/investments/use-investments-mutations";

const schema = z.object({
  reportingCurrencyCode: z.string().min(1, "Choose a currency."),
  defaultCostBasisMethod: z.enum(COST_BASIS_METHODS),
  defaultTaxProfile: z.enum(TAX_PROFILES),
});
type Values = z.infer<typeof schema>;

/** Household defaults for the investments area. */
export function InvestmentSettingsForm({ settings }: { settings: InvestmentSettings }) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: settings,
  });
  const mutation = useUpdateInvestmentSettingsMutation({
    successToast: { title: "Settings saved" },
    onSuccess: (data) => form.reset(data),
  });

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        mutation.reset();
        mutation.mutate(values);
      })}
    >
      <CurrencySelect
        control={form.control}
        name="reportingCurrencyCode"
        label="Reporting currency"
        description="Totals across accounts and currencies are shown in this currency."
        disabled={mutation.isPending}
      />
      <FormItem
        type="select"
        control={form.control}
        name="defaultCostBasisMethod"
        label="Default cost basis method"
        description="Applied to new accounts. Each account can override it."
        options={COST_BASIS_METHODS.map((value) => ({ value, label: COST_BASIS_LABELS[value] }))}
        disabled={mutation.isPending}
      />
      <FormItem
        type="select"
        control={form.control}
        name="defaultTaxProfile"
        label="Default tax profile"
        description="Applied to new accounts. Each account can override it."
        options={TAX_PROFILES.map((value) => ({ value, label: TAX_PROFILE_LABELS[value] }))}
        disabled={mutation.isPending}
      />
      {mutation.errorMessage ? (
        <Typography variant="small-destructive">{mutation.errorMessage}</Typography>
      ) : null}
      <PermissionButton
        permission={PERMISSIONS.INVESTMENTS_WRITE}
        type="submit"
        isLoading={mutation.isPending}
        loadingText="Saving..."
        disabled={!form.formState.isDirty}
      >
        Save settings
      </PermissionButton>
    </form>
  );
}
