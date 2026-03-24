import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="font-heading text-3xl">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Comprehensive insights into your financial health.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">R$15.255,90</p>
            <p className="text-xs text-muted-foreground">-6.3% vs previous period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">R$6.226,00</p>
            <p className="text-xs text-muted-foreground">-68.9% vs previous period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">R$9.029,90</p>
            <p className="text-xs text-muted-foreground">Income minus expenses</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
