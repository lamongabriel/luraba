"use client";

import {
  Copy01Icon,
  MoreHorizontalIcon,
  PlusSignIcon,
  Settings02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { MAX_PER_PAGE } from "@luraba/contracts";
import { formatISODate, getTodayInTimezone, shiftMonthKey } from "@luraba/domain";
import * as React from "react";

import {
  BudgetCategorySheet,
  type BudgetCategoryTarget,
} from "@/components/budgets/budget-category-sheet";
import { BudgetSettingsSheet } from "@/components/budgets/budget-settings-sheet";
import { BudgetsContent } from "@/components/budgets/budgets-content";
import { CopyLastMonthDialog } from "@/components/budgets/copy-last-month-dialog";
import { PageSection } from "@/components/finance/page-section";
import { PERMISSIONS, PermissionButton, useCan } from "@/components/permissions";
import { DataBoundary } from "@/components/states";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { budgetPace, replaceBodyWithExpense } from "@/lib/budgets";
import { formatMonthKeyLabel } from "@/lib/credit-card-invoices";
import { useSetCategoryBudgetMutation } from "@/mutations/budgets/use-budget-mutations";
import {
  useBudgetInsightsQuery,
  useMonthlyBudgetQuery,
} from "@/queries/budgets/use-budgets-queries";
import { useCategoriesQuery } from "@/queries/categories/use-categories-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { BudgetsEmpty } from "./budgets-empty";
import { BudgetsError } from "./budgets-error";
import { BudgetsLoading } from "./budgets-loading";

/**
 * Budgets on the Budgets & goals page: a titled section with the month's budgets, the add and
 * more-actions controls, and the sheets and dialogs they open. The month comes from the page.
 */
export function BudgetsSection({ month }: { month: string }) {
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const timezone = useAuthSessionStore((state) => state.user?.preferences.timezone ?? "UTC");
  const precisionOf = useCurrencyPrecision();
  const can = useCan();
  const [categorySheet, setCategorySheet] = React.useState<{
    open: boolean;
    target: BudgetCategoryTarget | null;
  }>({ open: false, target: null });
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [copyOpen, setCopyOpen] = React.useState(false);
  const [removeId, setRemoveId] = React.useState<string | null>(null);
  const setBudget = useSetCategoryBudgetMutation();

  const budgetQuery = useMonthlyBudgetQuery(month);
  const insightsQuery = useBudgetInsightsQuery(month);
  const categoriesQuery = useCategoriesQuery({ perPage: MAX_PER_PAGE });

  const monthLabel = formatMonthKeyLabel(month, language);
  const previousMonth = shiftMonthKey(month, -1);
  const budget = budgetQuery.data;
  const categories = categoriesQuery.data?.data;
  const precision = precisionOf(budget?.budgetCurrencyCode ?? "");
  const canEdit = can(PERMISSIONS.BUDGETS_UPDATE);

  const pace = budgetPace({
    month,
    today: formatISODate(getTodayInTimezone(timezone)),
    budgeted: budget?.totals.expenseBudgeted ?? 0,
    spent: budget?.totals.expenseActual ?? 0,
  });

  const error = budgetQuery.error ?? categoriesQuery.error;
  const openAddSheet = () => setCategorySheet({ open: true, target: { categoryId: null } });
  /** Saves one limit in place (0 removes it); the month updates at once and rolls back on error. */
  const saveLimit = (categoryId: string, amount: number) => {
    if (!budget) return;
    setBudget.mutate({
      month,
      categoryId,
      amount,
      body: replaceBodyWithExpense(budget, categoryId, amount),
    });
  };
  const removeRow = budget?.categories.expense.find((row) => row.categoryId === removeId);

  return (
    <PageSection
      title="Budgets"
      description="A monthly limit for each category. Guidance only: budgets do not change what is left to spend."
      actions={
        <div className="flex items-center gap-2">
          <PermissionButton
            permission={PERMISSIONS.BUDGETS_UPDATE}
            disabled={!budget}
            onClick={openAddSheet}
          >
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
            Add budget
          </PermissionButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon" aria-label="More budget actions">
                <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!canEdit || !budget} onSelect={() => setCopyOpen(true)}>
                <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
                Copy last month's budgets
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!budget} onSelect={() => setSettingsOpen(true)}>
                <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />
                Budget settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <DataBoundary
        isPending={budgetQuery.isPending || categoriesQuery.isPending}
        isError={budgetQuery.isError || categoriesQuery.isError}
        isEmpty={!categories?.some((category) => category.type === "expense")}
        loading={<BudgetsLoading />}
        errorState={
          <BudgetsError
            message={error?.message}
            onRetry={() => {
              void budgetQuery.refetch();
              void categoriesQuery.refetch();
            }}
          />
        }
        empty={<BudgetsEmpty />}
      >
        {budget && categories ? (
          <BudgetsContent
            budget={budget}
            insights={{
              data: insightsQuery.data,
              isPending: insightsQuery.isPending,
              isError: insightsQuery.isError,
              refetch: () => void insightsQuery.refetch(),
            }}
            categories={categories}
            pace={pace}
            precision={precision}
            language={language}
            onSave={saveLimit}
            onRemove={setRemoveId}
            onAdd={openAddSheet}
          />
        ) : null}
      </DataBoundary>

      {budget && categories ? (
        <>
          <BudgetCategorySheet
            open={categorySheet.open}
            onOpenChange={(open) => setCategorySheet((current) => ({ ...current, open }))}
            target={categorySheet.target}
            month={month}
            monthLabel={monthLabel}
            budget={budget}
            categories={categories}
            precision={precision}
            language={language}
          />
          <BudgetSettingsSheet
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            month={month}
            monthLabel={monthLabel}
            settings={budget.settings}
          />
        </>
      ) : null}
      <ConfirmDialog
        open={removeId !== null}
        onOpenChange={(open) => !open && setRemoveId(null)}
        variant="destructive"
        title={`Remove the ${removeRow?.categoryName ?? ""} budget?`}
        description={`Spending on this category stays, but it will have no limit in ${monthLabel}.`}
        confirmLabel="Remove budget"
        onConfirm={() => {
          if (removeId) saveLimit(removeId, 0);
          setRemoveId(null);
        }}
      />
      <CopyLastMonthDialog
        open={copyOpen}
        onOpenChange={setCopyOpen}
        month={month}
        previousMonth={previousMonth}
        monthLabel={monthLabel}
        previousMonthLabel={formatMonthKeyLabel(previousMonth, language)}
      />
    </PageSection>
  );
}
