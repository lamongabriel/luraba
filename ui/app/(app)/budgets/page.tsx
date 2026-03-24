import { budgetCategories } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function BudgetsPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="font-heading text-3xl">Budgets</h1>
        <p className="text-sm text-muted-foreground">Monitor planned versus actual spending by category.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>March 2026</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Spent</p>
              <p className="text-2xl font-semibold">R$6.226,00</p>
              <p className="text-xs text-muted-foreground">of R$5.000,00 budgeted</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Expected income</p>
              <p className="text-2xl font-semibold">R$15.000,00</p>
              <p className="text-xs text-muted-foreground">R$15.255,90 earned</p>
            </div>
          </div>

          <div className="space-y-2">
            {budgetCategories.map((category) => (
              <div key={category.name} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Spent {category.spent} / Budgeted {category.budgeted}
                  </p>
                </div>
                <Badge variant="outline">{category.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
