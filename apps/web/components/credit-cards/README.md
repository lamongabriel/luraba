# components/credit-cards

UI for credit cards: the month overview (`/credit-cards`) and the card detail page
(`/credit-cards/[id]`). It follows how bank apps show cards: limit breakdown, an invoice per month,
and the purchases that make an invoice up.

| Component | Role |
| --- | --- |
| `credit-card-preview.tsx`, `credit-card-brand.tsx` | The card visual and brand mark (also used by the card form). |
| `credit-card-sheet.tsx` | Create/edit sheet around `forms/create-edit-credit-card-form`. |
| `credit-card-carousel.tsx` | All cards in a horizontally scrollable row; a card opens its page. |
| `overview-summary.tsx` | One currency's totals for the month and when each card's invoice is due. |
| `limit-breakdown.tsx` | Segmented limit bar: closed invoice, open invoice, future invoices, available. |
| `latest-card-transactions.tsx` | Latest purchases/payments across cards, from the transactions feed. |
| `invoice-strip.tsx` / `invoice-history-chart.tsx` | Month strip and bar chart of every invoice, colored by status; both select an invoice. |
| `invoice-detail.tsx` | One invoice: totals, due date, summary, expenses grouped by date, Pay and Export. |
| `pay-invoice-modal.tsx` | Records a payment (`POST /credit-cards/:id/payments`). |
| `card-transaction-sheet.tsx` | Opens the regular transaction sheet (details, edit, delete) for a card purchase or payment. |

## Rules

- **Invoices are named after their due month.** "November invoice" is the cycle due in November,
  even though most of its purchases are from October. `invoiceMonthKey` in `lib/credit-card-invoices.ts`.
- **Invoice amounts are what you owe.** Headlines (strip, carousel, overview, invoice header) show
  `remainingAmount`: purchases minus payments, never negative. A paid invoice shows $0 and its payments are
  listed with the purchases. Only the history chart plots purchases (`statementAmount`) so months can be
  compared. A big payment fills the oldest invoices first and later ones drop to $0.
- **Status colors** live in `INVOICE_STATUS` (`lib/credit-card-invoices.ts`) and the
  `--color-invoice-*` tokens in `globals.css`: paid = green, closed and waiting = orange (`due`),
  closed and past its due date = red (`overdue`), open (new purchases land here) = blue, future =
  gray. The status itself comes from the API's `displayStatus`; do not re-derive it in the UI.
- **Limit maths is shared.** `buildLimitBreakdown` in `@luraba/domain` is used by the API
  (`GET /credit-cards/overview`) and as a fallback here. Future installments consume limit.
- **Payments settle the oldest unpaid invoice first** (API rule), so Pay suggests everything unpaid up to
  the selected invoice and says when that includes older ones. There is no "pay in installments"
  (invoice financing) in the API, so the UI has none.
- **Amounts in different currencies are never added**: the overview returns one totals entry per currency.
- A card purchase opens the shared transaction sheet by building a feed row from the invoice line
  (`invoiceLineToFeedRow`); the sheet loads the purchase itself.
- Placeholders and sample data use American names and institutions (Chase, American Express, John Doe),
  never Brazilian ones.

Data: `services/credit-cards.service.ts` -> `queries/credit-cards`. Overview is one request per month;
the detail page uses `forecast` (8 months back, 24 shown, so 15 future) plus `cycles/:cycleId` for the
selected invoice's items and payments. General web conventions: [../../README.md](../../README.md).
