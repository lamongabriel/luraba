# imports

Bring transactions into Luraba from a **CSV, Excel (.xlsx) or OFX** file in five steps. The file is
mapped to Luraba, never the other way round: nothing is guessed silently. Suggestions only pre-fill a
choice the user can change, and re-importing the same data is safe.

| Step | What the user does | Endpoint |
| --- | --- | --- |
| 1 Upload | Picks the destination account or card, drops the file, sees the raw rows | `POST /imports` (multipart), `GET /imports/:id/preview` |
| 2 Columns | Maps file columns to Luraba's fields, picks date and number formats | `PUT /imports/:id/columns` |
| 3 Values | Maps the file's merchants, categories and tags to Luraba records (or leaves them empty) | `GET /imports/:id/groups?field=`, `PUT /imports/:id/mappings` |
| 4 Review | Edits descriptions, removes rows, sees duplicates and short problems | `GET/PATCH /imports/:id/rows` |
| 5 Import | Background run with progress | `POST /imports/:id/start`, `GET /imports/:id` |

## Layers

```
file -> imports.table (raw cells) -> imports.columns (user mapping) -> staged rows
OFX  -> parsers (ParserAdapter)   ------------------------------------^
staged rows -> evaluate (kind + issues) -> importers -> Luraba records
```

- **Tables (CSV/Excel)**: `imports.table.ts` reads bytes into a `RawTable` (header row plus string cells;
  delimiter detection for CSV, first sheet for Excel; `.xls` is not supported). The table is stored on
  `import_batches.raw_table` so the mapping can be re-applied. No rows are staged until step 2.
- **Column mapping**: the fields are defined once in `@luraba/contracts` (`IMPORT_FIELDS`): date,
  description and amount are required; amount can be one column, a money out/in pair, or an amount plus
  a Type column (the user picks which Type values are money out). `imports.columns.ts` suggests a
  mapping from header aliases (English and Portuguese: `data`, `descricao`, `valor`, `estabelecimento`,
  `banco`...) and sample values (date format, decimal separator), and `applyMapping` turns the table
  into rows. A cell that cannot be read keeps its row with a short problem (`Bad date: "x"`); the user
  fixes or removes it in review. Add an alias in `ALIASES`, add a field in `IMPORT_FIELDS` and
  `applyMapping`. The destination account (step 1) fixes the currency; there is no account or currency
  column.
- **Installments** (credit cards): never guessed from text. The user says which rows are installments:
  an Installment column (`4/12`) in step 2, or per row in Review ("Installment purchase": N of M, saved
  through `PATCH /imports/:id/rows` `installment`). Reading a trailing `4/12` out of the description is an
  opt-in switch in step 2, off by default and never suggested. The plan is identified without any text
  (`seriesKeyFor`): installment `n` posted on `d` belongs to a purchase made `n - 1` months before `d`,
  so a plan is `plan|<purchase month>|<count>|<amount>` whatever name the bank prints. A purchase
  becomes one purchase of M installments back-dated to installment 1; next month's installment 5 of the
  same plan is flagged already in Luraba. On a card the suggested amount sign is "positive is money out"
  when most amounts are positive; a charge and its same-day reversal offset each other; a credit left
  over (a card payment) needs the paying account in step 3 or is removed.
- **Templates**: `import_templates` keeps one mapping per account or card. `previewImport` returns it as
  the suggestion when the file's header signature matches, so the next file of the same layout is one
  click. Saved when step 2 is confirmed with `saveTemplate`.
- **OFX** (`parsers/`): one `ParserAdapter` (`adapters/ofx.ts`, listed in `registry.ts`) reads the fixed
  fields (date, amount, memo, FITID, balance, period). Bank-specific reading of descriptions lives in
  `profiles/` (matched by the OFX institution header). The columns step does not apply and rows are
  staged on upload. The OFX kind must match the chosen destination (account vs card).
- `imports.service.ts`: upload, preview, column mapping, value groups, row edits, start.
  `imports.reconciliation.service.ts` compares a statement's balance with Luraba after the import.
- `imports.evaluate.ts`: pure. Decides each row's `kind` (`expense`, `income`, `transfer`,
  `card_purchase`, `card_payment`, `unsupported`) and its issues (error blocks the row, warning does
  not, info explains). Messages are short on purpose (one line); the UI shows the worst one.
- `imports.duplicates.ts`: duplicate detection, run whenever rows are staged or the target changes.
- `importers/`: one `RowImporter` per kind, listed in `importers/index.ts`. They reuse the
  transaction, purchase and payment services, so ledger rules stay in one place.
- `imports.processor.ts` + `imports.queue.ts`: the BullMQ worker (see Worker).
- Tables (`packages/db/src/schemas/imports.schema.ts`): `import_batches` (with `format`, `raw_table`,
  `column_mapping`), `import_rows`, `import_mappings`, `import_templates`, `import_records`.
  `import_rows` has no `household_id`: reach rows through the batch you already loaded with
  `requireBatch`.

`import_records` keeps one row per created transaction with the file's `original_name` (description exactly as
written) and its installment, so a transaction can be traced back to what the file said.

## Values (step 3)

Mappings are stored per household by a normalized key and remembered, so the next file arrives mapped.
Merchant keys are unprefixed (`normalizeKey` of the merchant column, else the description); the file's
own category and tag texts use `category:<text>` and `tag:<text>` (`valueSourceKey`). A row's texts are
kept in `hints.categoryValue` / `hints.tagValues`; `effectiveMapping` resolves row override, then the
value mapping, then the merchant group's default. An OFX row can also map to an account (transfer) or a
card (payment). A row can override its group's mapping (review step).

## Idempotence and duplicates

A row is a duplicate when, in order: its bank id (`external_id`: OFX FITID or the Reference ID column)
was imported before; its `fingerprint` (date + amount + normalized description, occurrence-numbered)
was; or its `series_key` (installment plan) was. Weaker matches (same date and amount, count-aware,
across formats) are flagged `possible`. Rows that offset each other in one file (a charge and its
reversal) are `netted` and skipped. Duplicates start removed and the review step counts them.

`pair_key` catches the same money seen from two statements: a transfer between two imported accounts and
a card payment seen from the bank and from the card. It is numbered per occurrence (`...#1`, `...#2`,
`withPairOccurrences`). The first statement imported wins. Duplicate marks are written to the row
`hints` at staging; adapter hints (`movement`, `paymentMethod`) live in the same column.

## Reconciliation

`GET /imports/:id/reconciliation` compares the closing balance in an OFX file with Luraba's balance on
the same date, the period totals and unmatched lines. The web shows it only for statements (a table has
no balance or period). For bank accounts it also reports the **implied opening balance**; card balances
include installments still to be billed, so compare transactions, not the balance, for cards.

## Worker

The worker runs inside the API process because importers use API services. With Redis the batch is
queued in BullMQ (`@luraba/queue`, `imports.ts`); without Redis it runs in-process. Set
`IMPORT_WORKER_ENABLED=false` on API replicas that should only enqueue. Processing is retry-safe: rows
that already have an outcome are skipped and `import_records` are matched before creating. The page can
be closed; the history lists running imports and resumes drafts at the right step.

## Adding things

- **A fixed-field format** (PDF, QIF...): write a `ParserAdapter`, list it in `parsers/registry.ts`, add
  a fixture and a test in `__tests__/parsers.unit.test.ts`, and add its extension to `tableKindOf`.
  PDF needs a text extractor, a per-bank layout adapter and OCR for scanned files.
- **A table field** (notes, a second date): add it to `IMPORT_FIELDS`, `applyMapping`, the aliases, and
  the importer that uses it.
- **A bank profile** (OFX descriptions): add it to `parsers/profiles/` and `profiles/index.ts`.
- **A new target** (investment positions): add a `RowImporter` and a row kind.

## HTTP

Contracts are in `packages/contracts/src/imports`. The upload is a multipart route outside the contract
registry (`POST /imports`, fields `file` and `accountId` or `creditCardId`, 10 MB); everything else is a
contract endpoint. Tests: `__tests__/` (`pnpm test:integration src/modules/imports`; the pure column
logic is in `columns.unit.test.ts`).
