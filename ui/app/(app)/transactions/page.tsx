"use client"

import { TransactionFilterForm } from "@/components/transaction-filter-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTransactionsQuery } from "@/queries/use-transactions.query"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function TransactionsPage() {
  const { data: transactions = [], isLoading, isError } = useTransactionsQuery()

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="font-heading text-3xl">Transactions</h1>
        <p className="text-sm text-muted-foreground">
          Review income, expenses, transfers, and card payments in one place.
        </p>
      </section>

      <TransactionFilterForm />

      <Card>
        <CardHeader>
          <CardTitle>Latest transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>Loading transactions...</TableCell>
                </TableRow>
              ) : null}
              {isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-destructive">
                    Failed to load transactions.
                  </TableCell>
                </TableRow>
              ) : null}
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">{tx.description}</TableCell>
                  <TableCell>{tx.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{tx.paymentMethod ?? "n/a"}</Badge>
                  </TableCell>
                  <TableCell>{new Date(tx.postedDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">{tx.isExcluded ? "Excluded" : "Included"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
