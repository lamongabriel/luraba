# components/credit-cards

UI for credit cards: the overview (`/credit-cards`) and the card detail page (`/credit-cards/[id]`).

**The overview is deliberately small**: title, one month button, a carousel of cards, then two columns (recent
transactions, credit utilization). No KPI row, no invoices or commitments sections, no charts, nothing split per
currency. It will grow later; add to it in the same shape (a section in one of the two columns).

| Component | Role |
| --- | --- |
| `credit-cards-carousel.tsx` | `CreditCardsCarousel` (+ skeleton): the cards right under the title. Desktop: a snapping row of large tiles that scrolls or drags with the mouse. Phone: one card per screen (scroll-snap) with page dots. Nothing sits under the tiles. |
| `credit-card-tile.tsx` | One card: name and brand mark, "Statement due" (large), "Paid in full" when the statement is settled, available limit and due date. Amounts stay in the card's own currency. A subtle gradient on surface tokens tinted by the card's color; the whole tile links to the card. Size constants are shared with the skeleton. |
| `recent-card-transactions.tsx` | "Recent transactions" + "View all": the latest card purchases on the month's statements, as the shared `ListRow`s built by `getTransactionsMobileRow` (merchant mark, date, the card via `AccountDisplay`, amount, `CategoryDisplay`). Opens `CardTransactionSheet`. |
| `credit-utilization.tsx` | "Credit utilization": limit in use as ONE base-currency number (`CombinedAmountDisplay`, per-currency breakdown in its popover), a bar with used % and total limit, and the month's top 4 categories (base currency, from `insights.combined.byCategory`). |
| `credit-card-preview.tsx`, `credit-card-brand.tsx` | The flat card visual (detail page and the card form) and the brand mark with an optional label for selects. Both draw the shared transparent `CardBrandMark` (`components/display/card-brand.tsx`): no white chip, painted in the current text color. |
| `credit-card-sheet.tsx` | `CreditCardSheet` (create/edit, edit shows the delete section). |
| `credit-card-manage-section.tsx` | The edit sheet's "Manage" part: delete behind a `ConfirmDialog`. |
| `limit-breakdown.tsx` | Detail: plain section with the segmented limit bar: closed invoice, open invoice, future invoices, available (+ skeleton). |
| `credit-card-details-panel.tsx` | Detail rail: bank, closing/due day, paying account. |
| `invoice-list.tsx` | Detail rail: every invoice (newest first) in a `ScrollArea`; also selects the invoice. |
| `invoice-detail.tsx` | `InvoiceSummary`, `InvoiceComposition` (small donut), `InvoicePayments`. |
| `invoice-history-chart.tsx` | Detail: slim bar strip of every invoice colored by status; click a bar to open it. |
| `card-purchases-table.tsx` | `ScopedTransactionsTable` that loads its lookups first; one invoice's expenses (detail). |
| `pay-invoice-modal.tsx` | Records a payment (`POST /credit-cards/:id/payments`). |
| `card-transaction-sheet.tsx` | Opens the regular transaction sheet for a purchase or payment row. |

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
- **Combined figures are ONE number in the household base currency.** The overview's `combined` (`limitUsed`, `limitTotal`, `limitAvailable`, invoice totals) and the insights' `combined.byCategory` are converted with the latest rate or the household override, rounded once (see [fx](../../../api/src/modules/fx/README.md)); render them with `CombinedAmountDisplay`. Per-card tiles stay in each card's own currency; never add currencies by hand.
- **The tile shows what is left to pay.** "Statement due" is the invoice's `remainingAmount` (purchases minus payments); "Paid in full" appears when the statement had purchases and nothing remains. A card with no statement in the month shows $0.00 and no due date.
- **The month is the invoice due month.** The overview, the insights and the recent transactions follow the one `MonthPicker` (`components/finance/month-picker.tsx`: a date button that opens presets and a month grid; a bottom drawer on a phone). "March" means the invoices due in March. The detail page keeps `MonthSelector`.
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

Overview: `InternalPageLayout` (title, "Track your spending and upcoming statements.", the month button and "Add credit card", a
small round icon button on a phone), the carousel, then `CREDIT_CARDS_COLUMNS_CLASS` (`_layout-classes.ts`, 8 + 4 columns on desktop,
stacked on a phone). `_loading.tsx` is built from the same pieces and constants (tile size, dots row, list rows), so nothing shifts
when data arrives.

Detail: a left rail with the information about the card and the invoice (card, details, limit, invoice composition donut, invoice
list) beside a right column with the invoice and its transactions in a grid with `items-stretch`. Separations are one hairline each.
The month selector in the header is followed by a "Current invoice" button that appears only when the selected invoice is not the
current (open) one. Loading twins (`_loading.tsx`) use the same sections and constants (`INVOICE_STRIP_HEIGHT`,
`INVOICE_COMPOSITION_HEIGHT`).
