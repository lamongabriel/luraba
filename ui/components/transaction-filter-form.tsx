"use client"

import * as React from "react"
import { useForm } from "react-hook-form"

import { transactionFilterSchema, type TransactionFilterValues } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function TransactionFilterForm() {
  const [type, setType] = React.useState<TransactionFilterValues["type"]>("all")

  const form = useForm<{ query: string }>({
    defaultValues: {
      query: "",
    },
  })

  const onSubmit = (values: { query: string }) => {
    const parsed = transactionFilterSchema.parse({
      query: values.query,
      type,
    })

    console.log("Transaction filters", parsed)
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[1fr_180px_auto]"
    >
      <Input placeholder="Search transactions..." {...form.register("query")} />
      <Select
        value={type}
        onValueChange={(value: TransactionFilterValues["type"]) => setType(value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="income">Income</SelectItem>
          <SelectItem value="expense">Expense</SelectItem>
          <SelectItem value="transfer">Transfer</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" className="w-full md:w-auto">
        Filter
      </Button>
    </form>
  )
}
