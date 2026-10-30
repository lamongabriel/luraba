"use client";

import type { Category, MonthlyBudget } from "@luraba/contracts";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { AmountDisplay } from "@/components/display";
import { KpiCard, KpiGrid } from "@/components/kpi";
import { PERMISSIONS, PermissionButton, useCan } from "@/components/permissions";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import {
  BUDGET_SECTIONS,
  type BudgetRow,
  type BudgetSectionKey,
  buildReplaceBudgetBody,
} from "@/lib/budgets";
import { majorToMinorUnits, minorToMajorUnits } from "@/lib/finance";
import { useReplaceMonthlyBudgetMutation } from "@/mutations/budgets/use-budget-mutations";
import { budgetQueryKeys } from "@/queries/budgets/use-budgets-queries";
import { getMonthlyBudget } from "@/services/budgets.service";
import { BudgetCardSettings } from "./budget-card-settings";
import { type BudgetGridRow, BudgetSection } from "./budget-section";

type Amounts = Record<BudgetSectionKey, Record<string, string>>;

function amountsFromBudget(budget: MonthlyBudget, precision: number): Amounts {
  const toDraft = (rows: BudgetRow[]) =>
    Object.fromEntries(
      rows.map((row) => [
        row.categoryId,
        row.budgetedAmount > 0 ? String(minorToMajorUnits(row.budgetedAmount, precision)) : "",
      ]),
    );
  return { income: toDraft(budget.categories.income), expense: toDraft(budget.categories.expense) };
}

function sumMinor(draft: Record<string, string>, precision: number): number {
  return Object.values(draft).reduce(
    (sum, value) => sum + majorToMinorUnits(Number(value || 0), precision),
    0,
  );
}

/**
 * The editable budget of one month. Typed amounts live here as drafts until "Save budget"; the
 * "left to assign" figure follows the drafts so the plan can be balanced before saving.
 */
export function BudgetEditor({
  month,
  previousMonth,
  budget,
  categories,
  precision,
  language,
}: {
  month: string;
  previousMonth: string;
  budget: MonthlyBudget;
  categories: Category[];
  precision: number;
  language: string;
}) {
  const can = useCan();
  const canEdit = can(PERMISSIONS.BUDGETS_UPDATE);
  const queryClient = useQueryClient();
  const saveMutation = useReplaceMonthlyBudgetMutation();

  const saved = React.useMemo(() => amountsFromBudget(budget, precision), [budget, precision]);
  const [amounts, setAmounts] = React.useState<Amounts>(saved);
  const [added, setAdded] = React.useState<Record<BudgetSectionKey, string[]>>({
    income: [],
    expense: [],
  });
  const [copyError, setCopyError] = React.useState<string | null>(null);
  const [isCopying, setIsCopying] = React.useState(false);

  // A saved budget (or another month) replaces the drafts.
  React.useEffect(() => {
    setAmounts(saved);
    setAdded({ income: [], expense: [] });
  }, [saved]);

  const categoriesById = React.useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const rowsFor = (key: BudgetSectionKey): BudgetGridRow[] => {
    const fromServer: BudgetRow[] = budget.categories[key];
    const known = new Set(fromServer.map((row) => row.categoryId));
    const extra: BudgetRow[] = added[key]
      .filter((id) => !known.has(id))
      .flatMap((id) => {
        const category = categoriesById.get(id);
        return category
          ? [
              {
                categoryId: id,
                categoryName: category.name,
                parentId: category.parentId,
                budgetedAmount: 0,
                actualAmount: 0,
              },
            ]
          : [];
      });
    return [...fromServer, ...extra].map((row) => ({
      ...row,
      category: categoriesById.get(row.categoryId) ?? null,
    }));
  };

  const plannedIncome = sumMinor(amounts.income, precision);
  const plannedExpense = sumMinor(amounts.expense, precision);
  const leftToAssign = plannedIncome - plannedExpense;
  const isDirty = JSON.stringify(amounts) !== JSON.stringify(saved);

  const copyPreviousMonth = async () => {
    setIsCopying(true);
    setCopyError(null);
    try {
      const previous = await queryClient.fetchQuery({
        queryKey: budgetQueryKeys.month(previousMonth),
        queryFn: () => getMonthlyBudget(previousMonth),
      });
      const copied = amountsFromBudget(previous, precision);
      setAmounts(copied);
      setAdded({
        income: previous.categories.income.map((row) => row.categoryId),
        expense: previous.categories.expense.map((row) => row.categoryId),
      });
    } catch {
      setCopyError("We couldn't load last month's budget. Please try again.");
    } finally {
      setIsCopying(false);
    }
  };

  const save = () => {
    saveMutation.reset();
    saveMutation.mutate({
      month,
      body: buildReplaceBudgetBody(amounts, (major) => majorToMinorUnits(major, precision)),
    });
  };

  const currencyCode = budget.budgetCurrencyCode;

  return (
    <div className="space-y-5">
      <KpiGrid columns={3}>
        <KpiCard title="Income planned" description="Received so far">
          <AmountDisplay
            amount={plannedIncome}
            currencyCode={currencyCode}
            size="lg"
            precision={precision}
            language={language}
          />
          <AmountDisplay
            amount={budget.totals.incomeActual}
            currencyCode={currencyCode}
            kind="income"
            showSign={false}
            precision={precision}
            language={language}
          />
        </KpiCard>
        <KpiCard title="Expenses planned" description="Spent so far">
          <AmountDisplay
            amount={plannedExpense}
            currencyCode={currencyCode}
            size="lg"
            precision={precision}
            language={language}
          />
          <AmountDisplay
            amount={budget.totals.expenseActual}
            currencyCode={currencyCode}
            kind="expense"
            showSign={false}
            precision={precision}
            language={language}
          />
        </KpiCard>
        <KpiCard
          title={leftToAssign < 0 ? "Planned over income" : "Left to assign"}
          description={
            leftToAssign === 0
              ? "Every bit of income has a job."
              : leftToAssign < 0
                ? "You planned more spending than income."
                : "Income not planned for yet."
          }
        >
          <AmountDisplay
            amount={Math.abs(leftToAssign)}
            currencyCode={currencyCode}
            kind={leftToAssign < 0 ? "expense" : "neutral"}
            showSign={false}
            size="lg"
            precision={precision}
            language={language}
          />
        </KpiCard>
      </KpiGrid>

      <BudgetCardSettings month={month} settings={budget.settings} canEdit={canEdit} />

      {BUDGET_SECTIONS.map((section) => {
        const rows = rowsFor(section.key);
        const present = new Set(rows.map((row) => row.categoryId));
        return (
          <BudgetSection
            key={section.key}
            section={section}
            rows={rows}
            amounts={amounts[section.key]}
            onAmountChange={(categoryId, value) =>
              setAmounts((current) => ({
                ...current,
                [section.key]: { ...current[section.key], [categoryId]: value },
              }))
            }
            addableCategories={categories.filter(
              (category) => category.type === section.categoryType && !present.has(category.id),
            )}
            onAddCategory={(categoryId) => {
              setAdded((current) => ({
                ...current,
                [section.key]: [...current[section.key], categoryId],
              }));
              setAmounts((current) => ({
                ...current,
                [section.key]: { ...current[section.key], [categoryId]: "" },
              }));
            }}
            currencyCode={currencyCode}
            precision={precision}
            language={language}
            readOnly={!canEdit}
          />
        );
      })}

      {canEdit ? (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <div className="min-w-0">
            {saveMutation.errorMessage || copyError ? (
              <Typography variant="small-destructive">
                {saveMutation.errorMessage || copyError}
              </Typography>
            ) : (
              <Typography variant="small-muted">
                {isDirty ? "You have unsaved changes." : "Budget saved."}
              </Typography>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              isLoading={isCopying}
              loadingText="Copying..."
              onClick={() => void copyPreviousMonth()}
            >
              Copy last month
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!isDirty || saveMutation.isPending}
              onClick={() => {
                setAmounts(saved);
                setAdded({ income: [], expense: [] });
              }}
            >
              Discard
            </Button>
            <PermissionButton
              permission={PERMISSIONS.BUDGETS_UPDATE}
              disabled={!isDirty}
              isLoading={saveMutation.isPending}
              loadingText="Saving..."
              onClick={save}
            >
              Save budget
            </PermissionButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
