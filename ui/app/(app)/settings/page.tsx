"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";

import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { PageHeader } from "@/components/finance/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DefaultPeriodOption, UserPreferences } from "@/interfaces/users";
import { usePreferencesQuery } from "@/queries/use-preferences.query";
import { useUpdatePreferencesMutation } from "@/queries/use-update-preferences.mutation";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English (en)" },
  { value: "pt-BR", label: "Portuguese - Brazil (pt-BR)" },
] as const;

const CURRENCY_OPTIONS = [
  { value: "BRL", label: "Brazilian Real (BRL)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
] as const;

const TIMEZONE_OPTIONS = [
  { value: "America/Sao_Paulo", label: "(-03:00) Brasilia" },
  { value: "UTC", label: "(UTC+00:00) UTC" },
] as const;

const DATE_FORMAT_OPTIONS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
] as const;

const DEFAULT_PERIOD_OPTIONS: Array<{ value: DefaultPeriodOption; label: string }> = [
  { value: "last_day", label: "Last Day" },
  { value: "current_week", label: "Current Week" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "current_month", label: "Current Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_90_days", label: "Last 90 Days" },
  { value: "current_year", label: "Current Year" },
  { value: "last_365_days", label: "Last 365 Days" },
  { value: "last_5_years", label: "Last 5 Years" },
  { value: "last_10_years", label: "Last 10 Years" },
  { value: "all_time", label: "All Time" },
];

const ACCOUNT_ORDER_OPTIONS = [
  { value: "name_asc", label: "Name (A-Z)" },
  { value: "name_desc", label: "Name (Z-A)" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
] as const;

const COUNTRY_OPTIONS = [
  { value: "BR", label: "Brazil" },
  { value: "US", label: "United States" },
] as const;

const CREDIT_EXPENSE_TIMING_OPTIONS = [
  { value: "spend_month", label: "Spend month" },
  { value: "payment_month", label: "Payment month" },
] as const;

const CREDIT_INSTALLMENT_MODE_OPTIONS = [
  { value: "per_installment", label: "Per installment" },
  { value: "full_amount", label: "Full amount at once" },
] as const;

const DEFAULT_VALUES: UserPreferences = {
  language: "en",
  currency: "BRL",
  timezone: "America/Sao_Paulo",
  dateFormat: "DD/MM/YYYY",
  defaultPeriod: "current_month",
  defaultAccountOrder: "name_asc",
  countryCode: "BR",
  budgetMonthStartsOn: 1,
  creditExpenseTiming: "spend_month",
  creditInstallmentBudgetMode: "per_installment",
  theme: "dark",
};

function toOrdinalDay(value: number) {
  if (value % 100 >= 11 && value % 100 <= 13) {
    return `${value}th`;
  }

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

export default function SettingsPage() {
  const { data, isLoading, isError } = usePreferencesQuery();
  const updateMutation = useUpdatePreferencesMutation();

  const form = useForm<UserPreferences>({
    defaultValues: DEFAULT_VALUES,
  });

  const language = useWatch({ control: form.control, name: "language" });
  const currency = useWatch({ control: form.control, name: "currency" });
  const timezone = useWatch({ control: form.control, name: "timezone" });
  const dateFormat = useWatch({ control: form.control, name: "dateFormat" });
  const defaultPeriod = useWatch({ control: form.control, name: "defaultPeriod" });
  const defaultAccountOrder = useWatch({ control: form.control, name: "defaultAccountOrder" });
  const countryCode = useWatch({ control: form.control, name: "countryCode" });
  const budgetMonthStartsOn = useWatch({ control: form.control, name: "budgetMonthStartsOn" });
  const creditExpenseTiming = useWatch({ control: form.control, name: "creditExpenseTiming" });
  const creditInstallmentBudgetMode = useWatch({
    control: form.control,
    name: "creditInstallmentBudgetMode",
  });

  React.useEffect(() => {
    if (!data) return;
    form.reset({ ...data, theme: "dark" });
  }, [data, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    await updateMutation.mutateAsync({ ...values, theme: "dark" });
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" />

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Configure dates, budgets, and account ordering.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? <Typography variant="body-muted">Loading preferences...</Typography> : null}
          {isError ? <Typography variant="body" className="text-destructive">Failed to load preferences.</Typography> : null}

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={language}
                  onValueChange={(value: UserPreferences["language"]) => form.setValue("language", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={currency}
                  onValueChange={(value: UserPreferences["currency"]) => form.setValue("currency", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select
                  value={timezone}
                  onValueChange={(value: UserPreferences["timezone"]) => form.setValue("timezone", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date format</Label>
                <Select
                  value={dateFormat}
                  onValueChange={(value: UserPreferences["dateFormat"]) => form.setValue("dateFormat", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select date format" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMAT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default period</Label>
                <Select
                  value={defaultPeriod}
                  onValueChange={(value: UserPreferences["defaultPeriod"]) => form.setValue("defaultPeriod", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default period" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_PERIOD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default account order</Label>
                <Select
                  value={defaultAccountOrder}
                  onValueChange={(value: UserPreferences["defaultAccountOrder"]) => form.setValue("defaultAccountOrder", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account order" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_ORDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Country</Label>
                <Select
                  value={countryCode}
                  onValueChange={(value: UserPreferences["countryCode"]) => form.setValue("countryCode", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Budget month starts on</Label>
                <Select
                  value={String(budgetMonthStartsOn)}
                  onValueChange={(value) => form.setValue("budgetMonthStartsOn", Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select start day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {toOrdinalDay(day)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Credit expense timing</Label>
                <Select
                  value={creditExpenseTiming}
                  onValueChange={(value: UserPreferences["creditExpenseTiming"]) =>
                    form.setValue("creditExpenseTiming", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timing" />
                  </SelectTrigger>
                  <SelectContent>
                    {CREDIT_EXPENSE_TIMING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Credit installment budget mode</Label>
                <Select
                  value={creditInstallmentBudgetMode}
                  onValueChange={(value: UserPreferences["creditInstallmentBudgetMode"]) =>
                    form.setValue("creditInstallmentBudgetMode", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select installment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {CREDIT_INSTALLMENT_MODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-dashed border-border/70 bg-[var(--color-container-inset)] px-4 py-4 text-sm leading-6 text-muted-foreground">
              Appearance is locked to Luraba dark. Existing preference data still stores a `theme` field for compatibility, but the app no longer exposes light or system themes.
            </div>

            <FormErrorBoundary error={updateMutation.error} />

            <Button type="submit" className="rounded-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save preferences"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
