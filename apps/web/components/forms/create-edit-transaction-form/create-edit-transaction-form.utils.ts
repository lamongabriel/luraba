import { format } from "date-fns"

import type {
  CreditCardPayment,
  CreditCardPurchase,
} from "@/interfaces/credit-card"
import type { TransactionFeedRow } from "@/interfaces/transaction"
import { minorToMajorUnits } from "@/lib/finance"
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query"

import type {
  CreateEditTransactionFormValues,
  TransactionFormKind,
} from "./create-edit-transaction-form.schema"

export interface TransactionFormDetails {
  payment?: CreditCardPayment
  purchase?: CreditCardPurchase
}

export function getTransactionFormKind(
  row?: TransactionFeedRow | null,
): TransactionFormKind {
  if (!row) return "expense"
  if (row.rowKind === "credit_card_installment") {
    return "credit_card_purchase"
  }
  if (row.rowKind === "credit_card_payment") return "credit_card_payment"
  if (row.originType === "transfer") return "transfer"
  if (row.originType === "income") return "income"
  return "expense"
}

export function getCurrencyPrecision(
  lookups: TransactionLookups,
  currencyCode: string | null | undefined,
) {
  return (
    lookups.currencies.find((currency) => currency.code === currencyCode)
      ?.precision ?? 2
  )
}

export function getAccountCurrencyCode(
  lookups: TransactionLookups,
  accountId: string,
) {
  return lookups.accounts.find((account) => account.id === accountId)
    ?.currencyCode
}

export function getCardCurrencyCode(
  lookups: TransactionLookups,
  creditCardId: string,
) {
  return lookups.creditCards.find((card) => card.id === creditCardId)
    ?.currencyCode
}

function toMajorAmount(
  amount: number | null | undefined,
  currencyCode: string | null | undefined,
  lookups: TransactionLookups,
) {
  if (amount === null || amount === undefined) return "" as const
  return minorToMajorUnits(amount, getCurrencyPrecision(lookups, currencyCode))
}

export function getTransactionFormDefaultValues(
  lookups: TransactionLookups,
  row?: TransactionFeedRow | null,
  details: TransactionFormDetails = {},
): CreateEditTransactionFormValues {
  const today = format(new Date(), "yyyy-MM-dd")
  const kind = getTransactionFormKind(row)
  const purchase = details.purchase
  const payment = details.payment
  const currencyCode =
    row?.currencyCode ??
    getCardCurrencyCode(
      lookups,
      purchase?.creditCardId ?? payment?.creditCardId ?? "",
    )

  return {
    kind,
    description:
      purchase?.description ?? payment?.description ?? row?.description ?? "",
    amount: toMajorAmount(
      purchase?.amount ?? payment?.amount ?? row?.amount,
      currencyCode,
      lookups,
    ),
    toAmount: toMajorAmount(row?.toAmount, row?.toCurrencyCode, lookups),
    accountId: row?.accountId ?? "",
    fromAccountId: payment?.fromAccountId ?? row?.accountId ?? "",
    toAccountId: row?.toAccountId ?? "",
    creditCardId:
      purchase?.creditCardId ??
      payment?.creditCardId ??
      row?.creditCardId ??
      "",
    categoryId: purchase?.categoryId ?? row?.categoryId ?? "",
    merchantId: purchase?.merchantId ?? row?.merchantId ?? "",
    paymentMethodCode: row?.paymentMethodCode ?? "",
    purchaseDate:
      purchase?.purchaseDate ??
      payment?.paymentDate ??
      row?.purchaseDate ??
      today,
    postedDate:
      purchase?.postedDate ?? payment?.postedDate ?? row?.postedDate ?? today,
    installmentCount: purchase?.installmentCount ?? row?.installmentCount ?? 1,
    includeInBudget: purchase?.includeInBudget ?? row?.includeInBudget ?? true,
    tagIds:
      purchase?.tags.map((tag) => tag.id) ??
      row?.tags.map((tag) => tag.id) ??
      [],
  }
}

export const TRANSACTION_KIND_OPTIONS = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
  { value: "credit_card_purchase", label: "Credit card purchase" },
  { value: "credit_card_payment", label: "Credit card payment" },
] as const
