# Transactions components

The transaction sheet (create, view, edit), its details and the delete dialog.

## Money back (`transaction-money-back.tsx`)

- `TransactionNetCost`: on an expense or card purchase, the **Net cost** block: Total paid, **Received back** (every
  linked refund, cashback or split: `RefundReasonDisplay`, description and date, `AccountDisplay` of where it landed,
  `AmountDisplay`), Total received back and **Out of my pocket**. It reads `GET /transactions/:id` (`moneyBack`), so it
  is fresh after linking. Loading is a skeleton with the same rows, a failure is a retryable `ErrorState`, and with
  nothing linked it renders nothing.
- `TransactionLinkedPurchase`: on a money-back row, **For: <purchase>** (opens that purchase in the same sheet via
  `onOpenTransaction`), plus Link/Change/Unlink through `PATCH /transactions/:id/link-refund`. The picker lists recent
  expenses and card purchases in the same currency; the API enforces the amount cap and returns a toast on failure.

Money-back reasons (`refund`, `cancellation`, `chargeback`, `cashback`, `split`) are labelled in
`components/display/constants.ts` (`REFUND_REASON_LABELS`); never hard-code them here.
