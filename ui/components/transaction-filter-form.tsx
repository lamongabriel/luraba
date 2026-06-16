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
  return (
    <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[1fr_180px_auto]">
      <Input placeholder="Search transactions..." defaultValue="travel" />
      <Select defaultValue="expense">
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
      <Button type="button" className="w-full md:w-auto">
        Preview filter
      </Button>
    </div>
  )
}
