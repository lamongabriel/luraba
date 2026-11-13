"use client";

import { Copy01Icon, MoreHorizontalIcon, Settings02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { MAX_PER_PAGE } from "@luraba/contracts";
import { shiftMonthKey } from "@luraba/domain";
import * as React from "react";

import {
  BudgetCategorySheet,
  type BudgetCategoryTarget,
} from "@/components/budgets/budget-category-sheet";
import { BudgetSettingsSheet } from "@/components/budgets/budget-settings-sheet";
import { BudgetsContent } from "@/components/budgets/budgets-content";
import { CopyLastMonthDialog } from "@/components/budgets/copy-last-month-dialog";
import { MonthPresetButton, useMonthFilter } from "@/components/filters";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { PageAddButton } from "@/components/finance/page-add-button";
import { PERMISSIONS, useCan } from "@/components/permissions";
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
import { replaceBodyWithExpense } from "@/lib/budgets";
import { formatMonthKeyLabel } from "@/lib/credit-card-invoices";
import { useSetCategoryBudgetMutation } from "@/mutations/budgets/use-budget-mutations";
import { useMonthlyBudgetQuery } from "@/queries/budgets/use-budgets-queries";
import { useCategoriesQuery } from "@/queries/categories/use-categories-query";
import { BudgetsEmpty } from "./_empty";
import { BudgetsError } from "./_error";
import { BudgetsLoading } from "./_loading";

export default function BudgetsPage() {
  const { month, setMonth, timezone, language } = useMonthFilter();
  const precisionOf = useCurrencyPrecision();
  const can = useCan();
  const canEdit = can(PERMISSIONS.BUDGETS_UPDATE);
  const [sheet, setSheet] = React.useState<{ open: boolean; target: BudgetCategoryTarget | null }>({
    open: false,
    target: null,
  });
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [copyOpen, setCopyOpen] = React.useState(false);
  const [removeId, setRemoveId] = React.useState<string | null>(null);
  const setBudget = useSetCategoryBudgetMutation();

  const budgetQuery = useMonthlyBudgetQuery(month);
  const categoriesQuery = useCategoriesQuery({ perPage: MAX_PER_PAGE });
  const budget = budgetQuery.data;
  const categories = categoriesQuery.data?.data;
  const precision = precisionOf(budget?.budgetCurrencyCode ?? "");
  const monthLabel = formatMonthKeyLabel(month, language);
  const previousMonth = shiftMonthKey(month, -1);
  const error = budgetQuery.error ?? categoriesQuery.error;
  const openSheet = (categoryId: string | null) => setSheet({ open: true, target: { categoryId } });
  const removeRow = budget?.categories.expense.find((row) => row.categoryId === removeId);

  return (
    <InternalPageLayout
      title="Budgets"
      subtitle="Monthly limits by category."
      actions={
        <>
          <MonthPresetButton
            value={month}
            onChange={setMonth}
            timezone={timezone}
            language={language}
          />
          <PageAddButton
            label="Add budget"
            permission={PERMISSIONS.BUDGETS_UPDATE}
            disabled={!budget}
            onClick={() => openSheet(null)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 md:size-7"
                aria-label="More budget actions"
              >
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
        </>
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
            categories={categories}
            precision={precision}
            language={language}
            canEdit={canEdit}
            onEdit={openSheet}
            onRemove={setRemoveId}
          />
        ) : null}
      </DataBoundary>

      {budget && categories ? (
        <>
          <BudgetCategorySheet
            open={sheet.open}
            onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
            target={sheet.target}
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
          if (removeId && budget) {
            setBudget.mutate({
              month,
              categoryId: removeId,
              amount: 0,
              body: replaceBodyWithExpense(budget, removeId, 0),
            });
          }
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
    </InternalPageLayout>
  );
}
