# components/credit-cards

UI for credit cards: the month overview (`/credit-cards`) and the card detail page
(`/credit-cards/[id]`). It follows how bank apps show cards: limit breakdown, an invoice per month,
and the purchases that make an invoice up.

| Component | Role |
| --- | --- |
| `credit-card-preview.tsx`, `credit-card-brand.tsx` | The card visual and brand mark (also used by the card form). The preview puts the brand logo on a white chip (`chip`) so it is readable on any card color; selects use the plain logo. |
| `credit-card-sheet.tsx` | `CreditCardSheet` (create/edit, edit shows the delete section) and `CreditCardEditSheet` (edit by card id, for the overview tiles). |
| `credit-card-manage-section.tsx` | The edit sheet's "Manage" part: delete behind a `ConfirmDialog`. Deleting is only reached through Edit. |
| `overview-kpis.tsx` | The month's four figures for one currency as a `KpiStrip` (invoices + change vs last month, still to pay, available limit, next due date). |
| `credit-card-grid.tsx` | `CreditCardGrid` (+ skeleton): the "Your cards" section, two tiles per row: visual (opens the card), `CreditCardDisplay` (bank first), a limit usage bar with used of limit, and a menu (view invoices, edit). Info block has a fixed height shared with the skeleton. |
| `overview-invoices.tsx` | "Invoices due" list: each card's invoice for the month (amount to pay, due date, status), soonest first. |
| `recent-purchases.tsx` | "Recent purchases": the 5 latest card purchases on the month's invoices, no sorting or filters, with "View all" to `/transactions?originTypes=credit_card_installment`. |
| `overview-insights.tsx` | Two plain `PageSection`s side by side from `GET /credit-cards/insights`: invoices + committed installments (flat bar chart) and spending by category (compact `DonutChartCard` with `legend="hover"`). No highlights, merchant or recurring-charge panels. |
| `limit-breakdown.tsx` | Plain section with the segmented limit bar: closed invoice, open invoice, future invoices, available (+ skeleton). |
| `credit-card-details-panel.tsx` | Detail rail: bank, closing/due day, paying account, as a plain section. The card's creator is not shown. |
| `invoice-list.tsx` | Detail rail: every invoice (newest first) in a `ScrollArea` that fills the rail's remaining height; also selects the invoice. |
| `invoice-detail.tsx` | `InvoiceSummary` (name, status, Pay/Export, neutral `KpiStrip`), `InvoiceComposition` (small `DonutChartCard` with `legend="hover"` for the rail: no permanent legend, name/amount/share in the tooltip), `InvoicePayments`. All plain sections. |
| `invoice-history-chart.tsx` | Slim flat bar strip of every invoice colored by status at the top of the detail page; click a bar to open that invoice. |
| `card-purchases-table.tsx` | `ScopedTransactionsTable` that loads its lookups first; one invoice's expenses (detail). |
| `pay-invoice-modal.tsx` | Records a payment (`POST /credit-cards/:id/payments`). |
| `card-transaction-sheet.tsx` | Opens the regular transaction sheet (details, edit, delete) for a purchase or payment row. |

## Rules

- **Invoices are named after their due month.** "November invoice" is the cycle due in November,
  even though most of its purchases are from October. `invoiceMonthKey` in `lib/credit-card-invoices.ts`.
- **Invoice amounts are what you owe.** Headlines (strip, invoices list, overview, invoice header) show
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
- **The headline KPIs are ONE number in the household base currency.** The overview returns `totals` per currency and
  `combined` (converted with the latest rate or the household override, rounded once; see
  [fx](../../../api/src/modules/fx/README.md)); `OverviewKpis` renders the single strip with `CombinedAmountDisplay`
  (per-currency amounts and rates in a popover, "≈ converted at <date>" under the figure, "Rate unavailable for X" and
  per-currency amounts when a rate is missing). Per-card tiles, invoices and the insights charts stay in each card's own
  currency (one insights block per currency); never add them by hand.
- **The month is the invoice due month.** The overview, the insights, the KPIs and the recent purchases all follow the
  `MonthSelector` (`components/finance/month-selector.tsx`, shared); "March" means the invoices due in March.
- **Tables are the shared transactions table.** Purchases are listed with `ScopedTransactionsTable`
  (`components/tables/transactions`), scoped by `billingCycleIds` (one per invoice due in the month, or the selected
  invoice). Never write a custom list of purchases.
- **The credit limit is required** (form and API). Cards created before that rule hold `-1` ("no limit"); they keep
  working, the edit form opens with an empty limit and asks for one on save.
- Default card color is dark gray (`DEFAULT_CREDIT_CARD_COLOR`).
- A purchase row opens the shared transaction sheet (`CardTransactionSheet`); the sheet loads the purchase itself.
- Placeholders and sample data use American names and institutions (Chase, American Express, John Doe),
  never Brazilian ones.

Data: `services/credit-cards.service.ts` -> `queries/credit-cards`. Overview and insights are one request per month each;
the detail page uses `forecast` (8 months back, 24 shown, so 15 future) plus `cycles/:cycleId` for the
selected invoice's items and payments. General web conventions: [../../README.md](../../README.md).

## Page structure

Both pages are a flow of plain sections (`components/finance/page-section.tsx`: heading row, content, optional hairline
`divider`), not a stack of cards. Overview: key-figure strip, then two zones in a 12-column grid (8 + 4): cards, then invoices chart beside the category donut on the left; invoices due and recent purchases on the right. The full purchases table lives on `/transactions`.
Detail: a left rail with the information about the card and the invoice (card, details, limit, invoice
composition donut, invoice list) beside a right column with the invoice and its transactions (comparison strip, invoice
figures, payments when there are some, expenses) in a grid with `items-stretch`, so both columns are the same height (the
invoice list fills what the rail has left). Separations are one hairline each: the figures strip carries its own border, so
the sections after it (payments, expenses) have no divider of their own (the expenses only get one when payments sit above
it). The month selector in the header is followed by a "Current invoice" button that appears only when the selected invoice
is not the current (open) one. Loading twins (`_loading.tsx`) are built from the same sections and constants
(`INVOICES_STRIP_HEIGHT`, `INVOICE_STRIP_HEIGHT`, `INVOICE_COMPOSITION_HEIGHT`).
