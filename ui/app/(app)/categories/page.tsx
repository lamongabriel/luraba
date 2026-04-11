"use client";

import * as React from "react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { EmptyState } from "@/components/finance/empty-state";
import { CategoryFormSheet } from "@/components/finance/forms/category-form-sheet";
import { PageHeader } from "@/components/finance/page-header";
import { SectionPanel } from "@/components/finance/section-panel";
import { StatusPill } from "@/components/finance/status-pill";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { useCategoriesQuery } from "@/queries/use-categories.query";

export default function CategoriesPage() {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const { data: categories = [], isLoading, isError } = useCategoriesQuery();
  const categoryNames = categories.reduce<Record<string, string>>((map, category) => {
    map[category.id] = category.name;
    return map;
  }, {});

  const incomeCategories = categories.filter((category) => category.type === "income");
  const expenseCategories = categories.filter((category) => category.type === "expense");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Categories"
        actions={
          <Button className="rounded-full" onClick={() => setSheetOpen(true)}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
            New category
          </Button>
        }
      />

      {isLoading ? <Typography variant="body-muted">Loading categories...</Typography> : null}
      {isError ? <Typography variant="small-destructive">Failed to load categories.</Typography> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionPanel title="Income categories" description="Used for incoming cashflow and credit budget recognition.">
          {incomeCategories.length === 0 ? (
            <EmptyState title="No income categories" description="Create an income category to classify salaries, refunds, or other income sources." />
          ) : (
            <div className="space-y-3">
              {incomeCategories.map((category) => (
                <div key={category.id} className="flex items-center justify-between rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] px-4 py-4">
                  <div>
                    <Typography variant="small-strong">{category.name}</Typography>
                    <Typography variant="small-muted">
                      {category.parentId ? `Child of ${categoryNames[category.parentId] ?? "another category"}` : "Top-level category"}
                    </Typography>
                  </div>
                  <StatusPill tone="positive">Income</StatusPill>
                </div>
              ))}
            </div>
          )}
        </SectionPanel>

        <SectionPanel title="Expense categories" description="Used for budgets, normal spending, and credit-card purchases.">
          {expenseCategories.length === 0 ? (
            <EmptyState title="No expense categories" description="Create expense categories to classify spending and build out monthly budgets." />
          ) : (
            <div className="space-y-3">
              {expenseCategories.map((category) => (
                <div key={category.id} className="flex items-center justify-between rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] px-4 py-4">
                  <div>
                    <Typography variant="small-strong">{category.name}</Typography>
                    <Typography variant="small-muted">
                      {category.parentId ? `Child of ${categoryNames[category.parentId] ?? "another category"}` : "Top-level category"}
                    </Typography>
                  </div>
                  <StatusPill tone="negative">Expense</StatusPill>
                </div>
              ))}
            </div>
          )}
        </SectionPanel>
      </div>

      <CategoryFormSheet open={sheetOpen} onOpenChange={setSheetOpen} categories={categories} />
    </div>
  );
}
