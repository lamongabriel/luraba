"use client";

import type {
  CreditExpenseTiming,
  CreditInstallmentBudgetMode,
  MonthlyBudget,
} from "@luraba/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import { CREDIT_EXPENSE_TIMING_OPTIONS, CREDIT_INSTALLMENT_MODE_OPTIONS } from "@/lib/budgets";
import { useUpdateBudgetMonthSettingsMutation } from "@/mutations/budgets/use-budget-mutations";

/** The value of the "follow the household" choice in the selects. */
const DEFAULT_CHOICE = "default";

function labelOf<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/**
 * How credit-card purchases made this month count in the budget. Each choice can follow the
 * household default or be overridden for this month only; saving re-counts the month's purchases.
 */
export function BudgetCardSettings({
  month,
  settings,
  canEdit,
}: {
  month: string;
  settings: MonthlyBudget["settings"];
  canEdit: boolean;
}) {
  const mutation = useUpdateBudgetMonthSettingsMutation();

  const save = (timing: CreditExpenseTiming | null, mode: CreditInstallmentBudgetMode | null) => {
    mutation.reset();
    mutation.mutate({
      month,
      body: { creditExpenseTiming: timing, creditInstallmentBudgetMode: mode },
    });
  };

  const overridden =
    settings.overrideCreditExpenseTiming !== null ||
    settings.overrideCreditInstallmentBudgetMode !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit cards in this budget</CardTitle>
        <CardDescription>
          Applies to card purchases made in this month. The default comes from your household
          settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="budget-card-timing">Counts in</Label>
            <Select
              value={settings.overrideCreditExpenseTiming ?? DEFAULT_CHOICE}
              disabled={!canEdit || mutation.isPending}
              onValueChange={(value) =>
                save(
                  value === DEFAULT_CHOICE ? null : (value as CreditExpenseTiming),
                  settings.overrideCreditInstallmentBudgetMode,
                )
              }
            >
              <SelectTrigger id="budget-card-timing" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_CHOICE}>
                  Household default (
                  {labelOf(CREDIT_EXPENSE_TIMING_OPTIONS, settings.defaultCreditExpenseTiming)})
                </SelectItem>
                {CREDIT_EXPENSE_TIMING_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Typography variant="small-muted">
              {
                CREDIT_EXPENSE_TIMING_OPTIONS.find(
                  (option) => option.value === settings.creditExpenseTiming,
                )?.description
              }
            </Typography>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budget-card-installments">Installments</Label>
            <Select
              value={settings.overrideCreditInstallmentBudgetMode ?? DEFAULT_CHOICE}
              disabled={!canEdit || mutation.isPending}
              onValueChange={(value) =>
                save(
                  settings.overrideCreditExpenseTiming,
                  value === DEFAULT_CHOICE ? null : (value as CreditInstallmentBudgetMode),
                )
              }
            >
              <SelectTrigger id="budget-card-installments" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_CHOICE}>
                  Household default (
                  {labelOf(
                    CREDIT_INSTALLMENT_MODE_OPTIONS,
                    settings.defaultCreditInstallmentBudgetMode,
                  )}
                  )
                </SelectItem>
                {CREDIT_INSTALLMENT_MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Typography variant="small-muted">
              {
                CREDIT_INSTALLMENT_MODE_OPTIONS.find(
                  (option) => option.value === settings.creditInstallmentBudgetMode,
                )?.description
              }
            </Typography>
          </div>
        </div>

        {mutation.errorMessage ? (
          <Typography variant="small-destructive">{mutation.errorMessage}</Typography>
        ) : null}
        {overridden && canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => save(null, null)}
          >
            Use the household default for this month
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
