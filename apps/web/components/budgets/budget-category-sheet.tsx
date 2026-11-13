"use client";

import { Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Category, MonthlyBudget } from "@luraba/contracts";
import * as React from "react";

import { CopyLastMonthDialog } from "@/components/budgets/copy-last-month-dialog";
import { CategoryDisplay } from "@/components/display";
import { FormActions } from "@/components/forms/form-actions";
import { FormSheet } from "@/components/forms/form-sheet";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/masked-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import { replaceBodyWithExpense } from "@/lib/budgets";
import { majorToMinorUnits, minorToMajorUnits } from "@/lib/finance";
import { useReplaceMonthlyBudgetMutation } from "@/mutations/budgets/use-budget-mutations";

/** `categoryId: null` adds a budget for a category that has none yet. */
export type BudgetCategoryTarget = { categoryId: string | null };

/**
 * Sets (or removes) one category's monthly limit. The API replaces the month as a whole, so the
 * rest of the month is sent back unchanged.
 */
export function BudgetCategorySheet({
  open,
  onOpenChange,
  target,
  month,
  monthLabel,
  previousMonth,
  previousMonthLabel,
  budget,
  categories,
  precision,
  language,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: BudgetCategoryTarget | null;
  month: string;
  monthLabel: string;
  /** Last month's key and label: the add flow offers to copy that month's budgets. */
  previousMonth: string;
  previousMonthLabel: string;
  budget: MonthlyBudget;
  categories: Category[];
  precision: number;
  language: string;
}) {
  const mutation = useReplaceMonthlyBudgetMutation();
  const [categoryId, setCategoryId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [copyOpen, setCopyOpen] = React.useState(false);

  const row = budget.categories.expense.find((item) => item.categoryId === target?.categoryId);
  const isNew = !target?.categoryId;
  const hasBudget = (row?.budgetedAmount ?? 0) > 0;

  // Each time the sheet opens it starts from the category being edited.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the sheet opens for a target
  React.useEffect(() => {
    if (!open) return;
    mutation.reset();
    setCategoryId(target?.categoryId ?? "");
    setAmount(
      row && row.budgetedAmount > 0 ? String(minorToMajorUnits(row.budgetedAmount, precision)) : "",
    );
  }, [open, target?.categoryId]);

  const budgeted = new Set(
    budget.categories.expense
      .filter((item) => item.budgetedAmount > 0)
      .map((item) => item.categoryId),
  );
  const choices = categories.filter((item) => item.type === "expense" && !budgeted.has(item.id));
  const chosen = categories.find((item) => item.id === categoryId);
  const minor = majorToMinorUnits(Number(amount || 0), precision);

  const save = (value: number) => {
    if (!categoryId) return;
    mutation.mutate(
      { month, body: replaceBodyWithExpense(budget, categoryId, value) },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isNew ? "Add a budget" : hasBudget ? "Edit budget" : "Set budget"}
      description={`How much you plan to spend on this category in ${monthLabel}.`}
    >
      <form
        className="flex min-h-full flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          save(minor);
        }}
      >
        {isNew ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setCopyOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed p-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">Copy last month's budgets</span>
                <span className="block text-xs text-muted-foreground">
                  Start {monthLabel} with the limits from {previousMonthLabel}.
                </span>
              </span>
            </button>
            <p className="text-center text-xs text-muted-foreground">or set one budget</p>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="budget-category">Category</Label>
          {isNew ? (
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="budget-category" className="w-full">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {choices.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <CategoryDisplay category={item} variant="inline" />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div id="budget-category">
              <CategoryDisplay
                category={chosen ?? { name: row?.categoryName ?? "", icon: null, color: null }}
                variant="inline"
              />
            </div>
          )}
          {isNew && choices.length === 0 ? (
            <Typography variant="small-muted">
              Every expense category already has a budget.
            </Typography>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="budget-amount">Monthly limit</Label>
          <MoneyInput
            id="budget-amount"
            value={amount}
            precision={precision}
            language={language}
            onValueChange={setAmount}
          />
        </div>

        {mutation.errorMessage ? (
          <Typography variant="small-destructive">{mutation.errorMessage}</Typography>
        ) : null}

        <FormActions className="mt-auto">
          {hasBudget ? (
            <Button
              type="button"
              variant="ghost"
              className="mr-auto text-destructive"
              disabled={mutation.isPending}
              onClick={() => save(0)}
            >
              Remove budget
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <PermissionButton
            type="submit"
            permission={PERMISSIONS.BUDGETS_UPDATE}
            disabled={!categoryId || minor <= 0}
            isLoading={mutation.isPending}
            loadingText="Saving..."
          >
            Save budget
          </PermissionButton>
        </FormActions>
      </form>
      <CopyLastMonthDialog
        open={copyOpen}
        onOpenChange={setCopyOpen}
        month={month}
        previousMonth={previousMonth}
        monthLabel={monthLabel}
        previousMonthLabel={previousMonthLabel}
        onCopied={() => onOpenChange(false)}
      />
    </FormSheet>
  );
}
