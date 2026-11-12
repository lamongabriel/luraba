# Lists (the mobile face of every table)

**Rule: no tables on mobile.** Below the `md` breakpoint (768px) a table of records is a plain list:
a compact row per record, like a banking app. Each row shows very little: a mark, a title, a muted
second line, an amount and a date. Nothing scrolls sideways. Tap opens the same detail drawer the
table row opens. At `md` and up the table is unchanged.

## How a table becomes a list

`DataTable` has a **required** `mobile` prop. Pass a `MobileRowConfig` and the table renders as a list
below `md` (both are in the DOM, switched by CSS, so there is no flash or layout shift):

```tsx
const mobile = React.useMemo(() => getTransactionsMobileRow({ language, lookups }), [...]);
<DataTable table={table} mobile={mobile} onRowClick={open} ... />
```

```ts
interface MobileRowConfig<TData> {
  row(data, { grouped }): ListRowProps   // leading, title, indicators, subtitle, amount, meta, actions
  group?(data): { key, label }           // group consecutive rows under a header (a day)
  groupSortIds?: string[]                // group only while sorted by these columns (else flat)
  ariaLabel?(data): string
}
```

- Build `leading`, `subtitle` and `amount` with the shared display components (`MerchantMark`,
  `AccountDisplay`, `AmountDisplay`, `TransactionTypeMark`...). Never hand-render those here.
- `grouped` tells the row to drop the date (the day header already says it). Group headers come
  from `dayGroup(date, language)` (`Today`, `Yesterday`, `Mon, Nov 10`).
- `actions` holds trailing controls (a switch, a delete button). They are marked `data-row-action`,
  so tapping them never opens the row.
- Keep rows tiny. The transactions row omits the original statement text, category, tags and creator;
  a note shows as a small icon. The drawer shows everything.
- Pagination, filters and the search toolbar are shared and responsive (rows-per-page hides on a
  phone, pager buttons are 40px). Row selection checkboxes are table-only (no table that has a
  list has bulk selection today); add a leading checkbox in `row()` if one ever needs it.
- Sorting on mobile is the page's default order (newest first); there are no column headers.

## Loading, error, empty

The skeleton must match the loaded list 1:1: pass `mobileList={{ grouped: true }}` to
`DataTableSkeleton` / `TableSkeleton` (same `h-14` rows, `size-8` mark, header row). Error and empty
states are the shared `ErrorState` / `EmptyState`, same as for the table.

## Components

| Piece | Role |
| --- | --- |
| `ListRow` | One row: leading mark, title + indicators, subtitle, amount over meta, actions. Fixed `h-14`. |
| `ListGroupHeader` | Group header (`h-8`). |
| `MobileList` | The rows of a TanStack table drawn as `ListRow`s with group headers; used by `DataTable`. |
| `ListSkeleton`, `ListRowSkeleton` | Loading twins of the above. |
| `dayGroup` | `{ key, label }` for a date. |

## Audit: every table in the web app

Converted (list below `md`, table at `md+`):

| Table | Where | Mobile row |
| --- | --- | --- |
| Transactions (`/transactions`) | `components/tables/transactions/transactions-table.tsx` | `getTransactionsMobileRow`: merchant mark (else type icon), title, account chip, amount, day groups |
| Scoped transactions (card overview, invoice) | `scoped-transactions-table.tsx`, `credit-cards/card-purchases-table.tsx` | same config |
| Account recent transactions | `accounts/account-recent-transactions.tsx` | same config without the account chip |
| Household members | `households/household-members-table.tsx` | member mark, name, email; role control and remove as actions |
| Household invitations | `households/household-invitations-table.tsx` | email, role · status · expiry; copy and cancel as actions |
| API keys | `settings/api-keys/api-keys-table.tsx` | label (editable), prefix · status · last used; switch and delete |
| MCP connections | `settings/mcp/mcp-connections-card.tsx` | agent, allowed · last used; revoke |

Entity pages (categories, merchants, tags, accounts, products, bills, goals) are already card or
list layouts, not tables.

Stay tables on a phone (dense comparison data; they scroll inside their own container, never the page):

| Table | Why |
| --- | --- |
| Investment positions, lots, events, tax tables, income, allocation targets/page, import wizard preview (`components/investments`, `app/(app)/investments`) | Many numeric columns compared across rows (quantity, price, cost, P/L, yield); a list would hide what the table is for. |
| Import columns / values / rows / raw tables (`components/imports`) | Column mapping and raw file preview: the columns are the content. |
| Notification preferences (`components/settings/notification-settings.tsx`) | An alerts x channels checkbox matrix with three narrow columns; it fits a phone. |

These are the only raw `Table` / `<table>` uses allowed outside `components/ui` and
`components/data-table`; `test/conventions.test.ts` lists them and fails on any other. A new
`DataTable` without `mobile` also fails the test (pass `"table"` with a reason for a new exception).
