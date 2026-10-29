# imports

Bring bank statements (OFX, CSV) into Luraba in three steps: **upload and preview**, **map and
review**, **import in the background**. Re-importing the same data is safe.

## Layers

```
file -> parsers (ParserAdapter) -> staging rows -> evaluate (kind + issues) -> importers -> Luraba records
```

- `parsers/`: one `ParserAdapter` per format (`adapters/`), listed in `registry.ts`. An adapter
  detects a file (score 0..1) and returns a `ParsedStatement` (normalized rows, signed minor units,
  `negative = money out / card charge`). Bank-specific reading of descriptions lives in
  `profiles/` (matched by the OFX institution header or the CSV layout); nothing outside
  `parsers/` knows a bank name. Bank text stays raw Portuguese data, labels are English.
- `imports.service.ts`: upload (stages rows), target choice, mappings, row edits, start.
  `imports.reconciliation.service.ts` compares the file with Luraba after the import.
- `imports.evaluate.ts`: pure. Decides each row's `kind` (`expense`, `income`, `transfer`,
  `card_purchase`, `card_payment`, `unsupported`) and its issues (error blocks the row, warning does
  not, info explains). Re-runs after every edit.
- `imports.duplicates.ts`: duplicate detection, run when the target is chosen.
- `importers/`: one `RowImporter` per kind, listed in `importers/index.ts`. They reuse the
  transaction, purchase and payment services, so ledger rules stay in one place.
- `imports.processor.ts` + `imports.queue.ts`: the BullMQ worker (see Worker).
- Tables (`packages/db/src/schemas/imports.schema.ts`): `import_batches`, `import_rows`,
  `import_mappings` (remembered per household), `import_records` (what each created row matched on,
  used by later imports). `import_rows` has a `household_id`-less child shape: reach rows through the
  batch you already loaded with `requireBatch`.

## Idempotence and duplicates

A row is a duplicate when, in order: its bank id (`external_id`: OFX FITID, Nubank `Identificador`)
was imported before; its `fingerprint` (date + amount + normalized description, occurrence-numbered)
was; or its `series_key` (installment plan) was. Weaker matches (same date and amount, count-aware,
across formats) are flagged `possible` and left for the user to decide. Rows that offset each other in one file
(a charge and its reversal) are `netted` and skipped.

`pair_key` catches the same money seen from two statements: a transfer between two imported
accounts and a card payment seen from the bank and from the card. It is numbered per occurrence
(`...#1`, `...#2`, `withPairOccurrences`) so two identical transfers on one day stay two movements.
The first statement imported wins. Duplicate marks are written to the row `hints` at staging; the
adapter hints (`movement`, `paymentMethod`) live in the same column.

## Mapping

Mappings are stored by normalized source key (`normalizeKey`) and remembered, so the next file
arrives mapped. Groups: the file's account (to a Luraba account or card), each distinct merchant
name (to a merchant, creatable in place), and optional category and tags. A row can override its
group's mapping.

## Reconciliation

`GET /imports/:id/reconciliation` compares the closing balance in the file with Luraba's balance on
the same date, the period totals, and unmatched lines by date and amount. For bank accounts it also
reports the **implied opening balance** (closing balance minus the file's net movement) against
Luraba's balance the day before the period: a difference there means history or an opening balance is
missing, not that this file imported wrongly. Card balances include installments still to be billed,
so compare transactions, not the balance, for cards.

## Worker

The worker runs inside the API process because importers use API services. With Redis the batch is
queued in BullMQ (`@luraba/queue`, `imports.ts`); without Redis it runs in-process. Set
`IMPORT_WORKER_ENABLED=false` on API replicas that should only enqueue. Processing is retry-safe:
rows that already have an outcome are skipped and `import_records` are matched before creating.

## Adding things

- **A format** (PDF, another bank's CSV): write a `ParserAdapter`, list it in `parsers/registry.ts`,
  add a fixture and a test in `__tests__/parsers.unit.test.ts`. PDF needs a text extractor
  (for example `pdf-parse` or `pdfjs-dist`), a per-bank layout adapter that turns lines into rows
  (statements are tables without delimiters, so each bank needs its own column rules), and OCR for
  scanned files. The rest of the pipeline does not change.
- **A bank profile**: add it to `parsers/profiles/` and `profiles/index.ts`.
- **A new target** (investment positions, for example): add a `RowImporter` and a row kind.

## HTTP

Contracts are in `packages/contracts/src/imports`. The upload is a multipart route outside the
contract registry (`POST /imports`, field `file`, 10 MB); everything else is a contract endpoint.
Tests: `__tests__/` (`pnpm test:integration src/modules/imports`).
