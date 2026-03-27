"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";

import { FormSheet } from "@/components/finance/forms/form-sheet";
import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MonthlyBudgetHttp } from "@/interfaces/http/budgets";
import type { CategoryHttp } from "@/interfaces/http/categories";
import { useAppMutation } from "@/lib/mutations";
import { replaceBudget } from "@/services/budgets.service";

type BudgetFormState = {
  income: Record<string, string>;
  expense: Record<string, string>;
};

function buildDefaultBudgetState(
  budget: MonthlyBudgetHttp,
  categories: CategoryHttp[],
): BudgetFormState {
  const state: BudgetFormState = { income: {}, expense: {} };

  for (const category of categories) {
    state[category.type][category.id] = "";
  }

  for (const item of budget.categories.income) {
    state.income[item.categoryId] = String(item.budgetedAmount);
  }

  for (const item of budget.categories.expense) {
    state.expense[item.categoryId] = String(item.budgetedAmount);
  }

  return state;
}

export function BudgetAllocationSheet({
  open,
  onOpenChange,
  month,
  budget,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  budget: MonthlyBudgetHttp;
  categories: CategoryHttp[];
}) {
  const queryClient = useQueryClient();
  const [state, setState] = React.useState<BudgetFormState>(() => buildDefaultBudgetState(budget, categories));

  React.useEffect(() => {
    setState(buildDefaultBudgetState(budget, categories));
  }, [budget, categories, open]);

  const mutation = useAppMutation({
    mutationFn: (payload: BudgetFormState) =>
      replaceBudget(month, {
        currencyCode: budget.currencyCode,
        income: Object.entries(payload.income)
          .map(([categoryId, amount]) => ({ categoryId, amount: Number(amount || 0) }))
          .filter((item) => item.amount > 0),
        expense: Object.entries(payload.expense)
          .map(([categoryId, amount]) => ({ categoryId, amount: Number(amount || 0) }))
          .filter((item) => item.amount > 0),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["budgets", month, budget.currencyCode] });
      await queryClient.invalidateQueries({ queryKey: ["budgets"] });
      onOpenChange(false);
    },
  });

  const incomeCategories = categories.filter((category) => category.type === "income");
  const expenseCategories = categories.filter((category) => category.type === "expense");

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit budget for ${month}`}
      description="Allocate monthly targets by income and expense category."
      className="sm:max-w-2xl"
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-heading text-lg">Income categories</h3>
            <p className="text-sm text-muted-foreground">Amounts are stored in minor units.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {incomeCategories.map((category) => (
              <div key={category.id} className="space-y-2 rounded-2xl border border-border/70 bg-[var(--color-container-inset)] p-4">
                <Label htmlFor={`income-${category.id}`}>{category.name}</Label>
                <Input
                  id={`income-${category.id}`}
                  type="number"
                  min={0}
                  value={state.income[category.id] ?? ""}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      income: { ...current.income, [category.id]: event.target.value },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-heading text-lg">Expense categories</h3>
            <p className="text-sm text-muted-foreground">Allocate the target spending by category for this month.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {expenseCategories.map((category) => (
              <div key={category.id} className="space-y-2 rounded-2xl border border-border/70 bg-[var(--color-container-inset)] p-4">
                <Label htmlFor={`expense-${category.id}`}>{category.name}</Label>
                <Input
                  id={`expense-${category.id}`}
                  type="number"
                  min={0}
                  value={state.expense[category.id] ?? ""}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      expense: { ...current.expense, [category.id]: event.target.value },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <FormErrorBoundary error={mutation.error} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate(state)}>
            {mutation.isPending ? "Saving..." : "Save budget"}
          </Button>
        </div>
      </div>
    </FormSheet>
  );
}
