# Filters

Every list filter in the web app is built here, on top of the vendored ReUI Filters
(`components/reui/filters`, installed with `npx shadcn add @reui/filters`; never edit it, never import it
outside this folder: `test/conventions.test.ts` enforces that).

## Pieces

| Piece | Use |
| --- | --- |
| `FilterBar` | The whole row: optional search, the fixed date chip, the filter chips and a trailing slot. Desktop renders ReUI chips; below `md` it renders a "Filters (N)" button that opens `MobileFiltersDrawer` (a bottom drawer). |
| `defineFilterFields` / `FilterFieldDef` | Declares what can be filtered: `multiselect`, `boolean`, `money` (uses `MoneyInput`, never `type="number"`) or `date`. One filter per field. |
| `useFilters({ fieldIds, keyPrefix?, defaultRules? })` | URL-backed state (nuqs). One `filter` param holding JSON `[[fieldId, operator, value], ...]`. Changing a filter resets `page`. `keyPrefix` lets two tables share a page (`membersFilter`). |
| `useDateFilter({ keyPrefix?, defaultPeriod?, billingCycles? })` | The date filter. Starts from `defaultPeriod`, else the user's default period setting; URL keys `period` or `dateFrom`/`dateTo`. |
| `DateFilterChip` | The date filter as one trigger: calendar icon, the preset name, the actual range (from `sm` up) and a chevron; popover with presets and a range calendar (a bottom drawer on a phone). |
| `FilterActionsMenu` | The desktop "Actions" menu: "Add filter" (field list) and "Columns". `FilterBar table={table}` renders it instead of the separate Filters and Columns buttons. |
| `MonthPresetButton` + `useMonthFilter` | The month control of month-based pages (Budgets, Bills): one button ("November 2026") that opens a dropdown on desktop and a bottom drawer on mobile (the shared `DropdownMenu` wrapper), with quick picks (this, last, next month) and every month from a few ahead to 18 back. `useMonthFilter()` returns `{ month, setMonth, timezone, language }` with `?month=YYYY-MM` in the URL (current month by default). The Credit cards page can adopt it for its month preset. |
| `tree.ts` | Pure helpers (`encodeTree`, `decodeTree`, `readValues`, `setFieldRule`, ...). Unit tested. |

## The date filter is required

The date range lives **outside** the ReUI query tree, so it can never be removed: it has no remove
button, "Clear" leaves it alone, and it is always applied. It is editable (presets plus a range
calendar). A page that needs a period uses `useDateFilter` + `FilterBar date={...}` (or
`DateFilterChip` alone in a header, as on the account page). Never add a second period control.

## Recipe

1. Build the defs with `defineFilterFields` (see `transactions-table-filters.ts`).
2. `const filters = useFilters({ fieldIds })`, `const date = useDateFilter()`.
3. Map `filters.values` to the existing API params; the API contracts are unchanged.
4. Render `<FilterBar defs filters date search trailing />`.
5. Wait for `date.ready` before querying; the loading skeleton must match the toolbar row.

## Mobile

`MobileFiltersDrawer` is a screen-by-screen flow in a bottom drawer: a row per field with its
summary, then one screen per field (search + checkboxes, Yes/No, min/max, calendar), "Clear all" and
"Done" in the footer.

## Never without a range

- The default is computed synchronously from the preferences, so the first render of a page already has its range
  (hard reload and URL params included). `date.ready` only gates the list request.
- A malformed `period` or `dateFrom`/`dateTo` in the URL falls back to the default.
- The filter row (with the date chip) must render in **every** state of the page, loading and error included: the
  transactions toolbar lives outside the table's states for that reason. A skeleton that stands in for the toolbar
  renders the real chip, never a placeholder.

## Billing cycles ("This month" on the transactions page)

`useDateFilter({ defaultPeriod: "current_month", billingCycles: true })`. The "This month" preset then runs from the
**earliest open billing-cycle start across the household's cards, or the 1st of the month, whichever is earlier,
through the last day of the month** (`getMonthRangeWithOpenCycles` in `@luraba/domain`). A card whose cycle opened on
the 27th of last month therefore pulls the range back to the 27th, so purchases in the open cycle show up. The trigger
shows the real range ("Oct 27 - Nov 30"). The cycle starts come from the existing endpoints (`GET /credit-cards`, then
`GET /credit-cards/:id/cycles?displayStatuses=current`, see `useOpenCycleStarts`); no API change. `ready` waits for
them; a card list that fails or is forbidden counts as "no cycles", so the page is never blocked. Other presets
(Last month, Last 30 days...) are unchanged.

## Mobile

`FilterBar` takes `mobileOpen` / `onMobileOpenChange` / `mobileTrigger={false}` when the Filters button lives in the
page header (transactions: a circular icon button). There is no Actions menu or column menu on a phone.
