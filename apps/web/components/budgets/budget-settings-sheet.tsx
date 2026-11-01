"use client";

import type {
  CreditExpenseTiming,
  CreditInstallmentBudgetMode,
  MonthlyBudget,
} from "@luraba/contracts";

import { FormSheet } from "@/components/forms/form-sheet";
import { PERMISSIONS, useCan } from "@/components/permissions";
import { Button } from "@/components/ui/button";
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

/** The value of the "same as household" choice in the selects. */
const DEFAULT_CHOICE = "default";

function labelOf<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/**
 * Budget settings, opened from the page menu so they take no room on the page. For now they decide
 * how credit card purchases made in the month count: which month, and whole purchase or per
 * installment. Each follows the household setting unless changed here for this month only.
 */
export function BudgetSettingsSheet({
  open,
  onOpenChange,
  month,
  monthLabel,
  settings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  monthLabel: string;
  settings: MonthlyBudget["settings"];
}) {
  const canEdit = useCan()(PERMISSIONS.BUDGETS_UPDATE);
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
  const disabled = !canEdit || mutation.isPending;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Budget settings"
      description={`Choose how credit card purchases made in ${monthLabel} count in the budget. Changes only affect this month.`}
    >
      <div className="space-y-1.5">
        <Label htmlFor="budget-card-timing">Count card purchases in</Label>
        <Select
          value={settings.overrideCreditExpenseTiming ?? DEFAULT_CHOICE}
          disabled={disabled}
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
              Same as household (
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
          disabled={disabled}
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
              Same as household (
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

      {mutation.errorMessage ? (
        <Typography variant="small-destructive">{mutation.errorMessage}</Typography>
      ) : null}
      {overridden && canEdit ? (
        <Button
          type="button"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => save(null, null)}
        >
          Use the household settings for this month
        </Button>
      ) : null}
    </FormSheet>
  );
}
