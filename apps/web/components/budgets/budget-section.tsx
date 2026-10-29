"use client";

import type { Category } from "@luraba/contracts";
import { AmountDisplay, CategoryDisplay } from "@/components/display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyInput } from "@/components/ui/masked-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import {
  type BUDGET_SECTIONS,
  type BudgetRow,
  budgetProgressPercent,
  budgetRowRemaining,
  orderBudgetRows,
} from "@/lib/budgets";
import { majorToMinorUnits } from "@/lib/finance";
import { cn } from "@/lib/utils";

type Section = (typeof BUDGET_SECTIONS)[number];

export type BudgetGridRow = BudgetRow & { category: Category | null };

/** One section of the budget (income or expenses): a planned amount per category and how it is going. */
export function BudgetSection({
  section,
  rows,
  amounts,
  onAmountChange,
  addableCategories,
  onAddCategory,
  currencyCode,
  precision,
  language,
  readOnly,
}: {
  section: Section;
  rows: BudgetGridRow[];
  /** Typed planned amounts (canonical decimal strings, major units) by category id. */
  amounts: Readonly<Record<string, string>>;
  onAmountChange: (categoryId: string, value: string) => void;
  addableCategories: Category[];
  onAddCategory: (categoryId: string) => void;
  currencyCode: string;
  precision: number;
  language: string;
  readOnly: boolean;
}) {
  const ordered = orderBudgetRows(rows);
  const kind = section.key;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{section.title}</CardTitle>
        <CardDescription>{section.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-2 pb-1 sm:grid">
          <Typography variant="meta">Category</Typography>
          <Typography variant="meta">Planned</Typography>
          <Typography variant="meta" className="text-right">
            {kind === "income" ? "Received" : "Spent"}
          </Typography>
          <Typography variant="meta" className="text-right">
            {section.leftLabel}
          </Typography>
        </div>

        {ordered.length === 0 ? (
          <Typography variant="small-muted" className="px-2 py-3">
            Nothing planned yet. Add a category to start.
          </Typography>
        ) : null}

        {ordered.map(({ row, depth }) => {
          const planned = Number(amounts[row.categoryId] || 0);
          const plannedMinor = majorToMinorUnits(planned, precision);
          const remaining = budgetRowRemaining(plannedMinor, row.actualAmount);
          const percent = budgetProgressPercent(plannedMinor, row.actualAmount);
          const over = kind === "expense" && remaining < 0;

          return (
            <div
              key={row.categoryId}
              className="grid items-center gap-x-3 gap-y-2 rounded-lg px-2 py-2 hover:bg-muted/40 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]"
            >
              <div className={cn("min-w-0", depth === 1 && "pl-5")}>
                <CategoryDisplay
                  category={row.category ?? { name: row.categoryName, icon: null, color: null }}
                  variant="inline"
                />
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", over ? "bg-destructive" : "bg-primary")}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              <MoneyInput
                aria-label={`${row.categoryName} planned amount`}
                value={amounts[row.categoryId] ?? ""}
                precision={precision}
                language={language}
                disabled={readOnly}
                onValueChange={(value) => onAmountChange(row.categoryId, value)}
              />

              <div className="flex items-center justify-between sm:justify-end">
                <Typography variant="small-muted" className="sm:hidden">
                  {kind === "income" ? "Received" : "Spent"}
                </Typography>
                <AmountDisplay
                  amount={row.actualAmount}
                  currencyCode={currencyCode}
                  kind={kind}
                  showSign={false}
                  precision={precision}
                  language={language}
                />
              </div>

              <div className="flex items-center justify-between sm:justify-end">
                <Typography variant="small-muted" className="sm:hidden">
                  {over ? section.overLabel : section.leftLabel}
                </Typography>
                <AmountDisplay
                  amount={Math.abs(remaining)}
                  currencyCode={currencyCode}
                  kind={over ? "expense" : "neutral"}
                  showSign={false}
                  precision={precision}
                  language={language}
                />
              </div>
            </div>
          );
        })}

        {!readOnly && addableCategories.length > 0 ? (
          <div className="pt-2">
            <Select value="" onValueChange={onAddCategory}>
              <SelectTrigger aria-label={section.addLabel} className="w-full sm:w-64">
                <SelectValue placeholder={section.addLabel} />
              </SelectTrigger>
              <SelectContent>
                {addableCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
