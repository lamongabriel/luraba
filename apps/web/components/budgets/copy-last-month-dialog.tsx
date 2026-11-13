"use client";

import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { budgetToReplaceBody } from "@/lib/budgets";
import { useReplaceMonthlyBudgetMutation } from "@/mutations/budgets/use-budget-mutations";
import { budgetQueryKeys } from "@/queries/budgets/use-budgets-queries";
import { getMonthlyBudget } from "@/services/budgets.service";

/** Replaces this month's budgets with last month's, after a confirmation. Opened from the add-budget drawer. */
export function CopyLastMonthDialog({
  open,
  onOpenChange,
  month,
  previousMonth,
  monthLabel,
  previousMonthLabel,
  onCopied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  previousMonth: string;
  monthLabel: string;
  previousMonthLabel: string;
  /** Called after the budgets were copied (the add-budget drawer closes itself). */
  onCopied?: () => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useReplaceMonthlyBudgetMutation();
  const [isFetching, setIsFetching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the dialog opens
  React.useEffect(() => {
    if (open) {
      setError(null);
      mutation.reset();
    }
  }, [open]);

  const copy = async () => {
    setIsFetching(true);
    setError(null);
    try {
      const previous = await queryClient.fetchQuery({
        queryKey: budgetQueryKeys.month(previousMonth),
        queryFn: () => getMonthlyBudget(previousMonth),
      });
      const body = budgetToReplaceBody(previous);
      if (body.income.length + body.expense.length === 0) {
        setError(`${previousMonthLabel} has no budgets to copy.`);
        return;
      }
      mutation.mutate(
        { month, body },
        {
          onSuccess: () => {
            onOpenChange(false);
            onCopied?.();
          },
        },
      );
    } catch {
      setError(`We couldn't load the ${previousMonthLabel} budgets. Please try again.`);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="warning"
      title={`Copy the ${previousMonthLabel} budgets?`}
      description={`This replaces every budget in ${monthLabel} with the ones from ${previousMonthLabel}.`}
      confirmLabel="Copy budgets"
      loadingLabel="Copying..."
      isLoading={isFetching || mutation.isPending}
      errorMessage={error ?? mutation.errorMessage}
      onConfirm={() => void copy()}
    />
  );
}
