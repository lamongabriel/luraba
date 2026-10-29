# exports

Download what Luraba shows as CSV or JSON.

- `exporters/` holds one `Exporter` per kind of data: `transactions.ts`, and `lists.ts` (accounts,
  credit cards, merchants, categories, tags). `exporters/index.ts` is the registry and also defines
  `everything`, which bundles every table (JSON only, since CSV is one table per file).
- Exporters read through module repositories (household scoped) and return plain tables
  (`ExportTable`); `exports.format.ts` serializes CSV and JSON.
- Transaction amounts are exported in major units with two decimals (`12.34`) next to the currency
  code; dates as `YYYY-MM-DD`.
- Routes: `GET /exports` (the list, a contract endpoint) and `GET /exports/:id?format=csv|json&dateFrom&dateTo`
  (a plain download route outside the contract registry; the date range applies to transactions only).

To add an export, write an exporter and list it in `exporters/index.ts`; the web panel reads the list.
