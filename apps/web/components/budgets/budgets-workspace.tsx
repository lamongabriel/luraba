"use client"

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { addMonths, format, parseISO } from "date-fns"
import { useEffect, useMemo, useState } from "react"

import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { PERMISSIONS } from "@/components/permissions/permissions.constants"
import { useCan } from "@/components/permissions/use-can"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { MAX_PER_PAGE } from "@/interfaces/api"
import { formatCurrency } from "@/lib/finance"
import { useReplaceMonthlyBudgetMutation } from "@/mutations/budgets/use-budget-mutations"
import { useUpdateHouseholdMutation } from "@/mutations/households/use-household-mutations"
import { useMonthlyBudgetQuery } from "@/queries/budgets/use-monthly-budget-query"
import { useCategoriesQuery } from "@/queries/categories/use-categories-query"
import { useHouseholdsQuery } from "@/queries/households/use-households-query"
import { useAuthSessionStore } from "@/stores/auth-session-store"

function monthKey(value: Date) {
  return format(value, "yyyy-MM")
}

export function BudgetsWorkspace() {
  const [month, setMonth] = useState(monthKey(new Date()))
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [monthStart, setMonthStart] = useState("1")
  const [creditTiming, setCreditTiming] = useState<
    "spend_month" | "payment_month"
  >("spend_month")
  const [installmentMode, setInstallmentMode] = useState<
    "per_installment" | "full_amount"
  >("per_installment")
  const canUpdate = useCan()(PERMISSIONS.BUDGETS_UPDATE)
  const activeHouseholdId = useAuthSessionStore(
    (state) => state.activeHouseholdId,
  )
  const households = useHouseholdsQuery({ perPage: MAX_PER_PAGE })
  const household = households.data?.data.find(
    (item) => item.id === activeHouseholdId,
  )
  const budget = useMonthlyBudgetQuery(month)
  const categories = useCategoriesQuery({ perPage: MAX_PER_PAGE })
  const replaceBudget = useReplaceMonthlyBudgetMutation()
  const updateHousehold = useUpdateHouseholdMutation({
    onSuccess: () => {
      setSettingsOpen(false)
      households.refetch()
    },
  })

  const rows = useMemo(() => {
    const data = budget.data
    if (!data) return []
    return [...data.categories.expense, ...data.categories.income]
  }, [budget.data])

  useEffect(() => {
    if (!budget.data) return
    setDraft(
      Object.fromEntries(
        rows.map((row) => [row.categoryId, String(row.budgetedAmount / 100)]),
      ),
    )
  }, [budget.data, rows])

  useEffect(() => {
    if (!household) return
    setMonthStart(String(household.budgetMonthStartsOn))
    setCreditTiming(household.creditExpenseTiming)
    setInstallmentMode(household.creditInstallmentBudgetMode)
  }, [household])

  function save() {
    if (!budget.data || !canUpdate) return
    const expenseIds = new Set(
      budget.data.categories.expense.map((row) => row.categoryId),
    )
    const allocations = Object.entries(draft)
      .map(([categoryId, value]) => ({
        categoryId,
        amount: Math.round(Number(value || 0) * 100),
      }))
      .filter((item) => item.amount > 0)
    replaceBudget.mutate({
      month,
      body: {
        expense: allocations.filter((item) => expenseIds.has(item.categoryId)),
        income: allocations.filter((item) => !expenseIds.has(item.categoryId)),
      },
    })
  }

  if (budget.isLoading || categories.isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }
  if (budget.isError)
    return (
      <ErrorState
        title="Couldn't load this budget"
        description={budget.error.message}
        onRetry={() => budget.refetch()}
      />
    )
  if (!budget.data)
    return (
      <EmptyState
        title="No budget available"
        description="Choose another month or create your first allocations."
      />
    )

  const totals = budget.data.totals
  const remaining = totals.expenseBudgeted - totals.expenseActual
  const currency = budget.data.displayCurrencyCode

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Plan spending by category and keep the month visible.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {budget.data.budgetCurrencyCode} budget, shown in {currency}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border/80 p-1">
          <Button
            aria-label="Previous month"
            variant="ghost"
            size="icon-sm"
            onClick={() =>
              setMonth(monthKey(addMonths(parseISO(`${month}-01`), -1)))
            }
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} />
          </Button>
          <span className="min-w-28 text-center text-xs font-medium">
            {format(parseISO(`${month}-01`), "MMMM yyyy")}
          </span>
          <Button
            aria-label="Next month"
            variant="ghost"
            size="icon-sm"
            onClick={() =>
              setMonth(monthKey(addMonths(parseISO(`${month}-01`), 1)))
            }
          >
            <HugeiconsIcon icon={ArrowRight01Icon} />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Planned expenses</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(totals.expenseBudgeted, currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Spent</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(totals.expenseActual, currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Remaining</CardTitle>
          </CardHeader>
          <CardContent
            className={
              "text-2xl font-semibold " +
              (remaining < 0 ? "text-destructive" : "text-emerald-600")
            }
          >
            {formatCurrency(remaining, currency)}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">Category allocations</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Set an amount for each category. Changes replace this month
            atomically.
          </p>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            className="min-h-48"
            title="No budget categories yet"
            description="Create expense or income categories first."
          />
        ) : (
          <div className="divide-y divide-border/70 rounded-xl border border-border/70">
            {rows.map((row) => (
              <div
                key={row.categoryId}
                className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_10rem] sm:items-center"
              >
                <div>
                  <p className="text-sm font-medium">{row.categoryName}</p>
                  <p className="text-xs text-muted-foreground">
                    Actual {formatCurrency(row.actualAmount, currency)}
                  </p>
                </div>
                <Input
                  aria-label={`${row.categoryName} budget`}
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={!canUpdate}
                  value={draft[row.categoryId] ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [row.categoryId]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {canUpdate ? (
        <div className="flex justify-end">
          <Button isLoading={replaceBudget.isPending} onClick={save}>
            Save budget
          </Button>
        </div>
      ) : null}
      {canUpdate ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSettingsOpen(true)}
        >
          <HugeiconsIcon icon={Settings02Icon} /> Budget settings
        </Button>
      ) : null}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Budget settings</DialogTitle>
            <DialogDescription>
              These settings apply to the selected household.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budget-month-start">Month starts on day</Label>
              <Input
                id="budget-month-start"
                type="number"
                min="1"
                max="31"
                value={monthStart}
                onChange={(event) => setMonthStart(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Credit-card expense timing</Label>
              <Select
                value={creditTiming}
                onValueChange={(value) =>
                  setCreditTiming(value as typeof creditTiming)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spend_month">Spend month</SelectItem>
                  <SelectItem value="payment_month">Payment month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Installment budget mode</Label>
              <Select
                value={installmentMode}
                onValueChange={(value) =>
                  setInstallmentMode(value as typeof installmentMode)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_installment">
                    Per installment
                  </SelectItem>
                  <SelectItem value="full_amount">Full amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              isLoading={updateHousehold.isPending}
              disabled={!household}
              onClick={() =>
                household &&
                updateHousehold.mutate({
                  householdId: household.id,
                  body: {
                    budgetMonthStartsOn: Number(monthStart),
                    creditExpenseTiming: creditTiming,
                    creditInstallmentBudgetMode: installmentMode,
                  },
                })
              }
            >
              Save settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
