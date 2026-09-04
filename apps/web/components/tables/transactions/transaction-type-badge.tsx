"use client"

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  CreditCardIcon,
  Exchange01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { TransactionFeedOriginType } from "@luraba/contracts"
import { Badge } from "@/components/ui/badge"

const TYPE_LABELS: Record<TransactionFeedOriginType, string> = {
  adjustment: "Adjustment",
  credit_card_installment: "Installment",
  credit_card_payment: "Card payment",
  expense: "Expense",
  income: "Income",
  transfer: "Transfer",
}

function getTypeIcon(type: TransactionFeedOriginType) {
  if (type === "credit_card_installment" || type === "credit_card_payment") {
    return CreditCardIcon
  }
  if (type === "transfer") return Exchange01Icon
  return type === "income" ? ArrowDown01Icon : ArrowUp01Icon
}

export function TransactionTypeBadge({
  type,
}: {
  type: TransactionFeedOriginType
}) {
  return (
    <Badge variant="outline" className="max-w-36 gap-1.5 px-2">
      <HugeiconsIcon
        icon={getTypeIcon(type)}
        strokeWidth={2}
        className="size-3"
      />
      <span className="truncate">{TYPE_LABELS[type]}</span>
    </Badge>
  )
}

export function getTransactionTypeLabel(type: TransactionFeedOriginType) {
  return TYPE_LABELS[type]
}
