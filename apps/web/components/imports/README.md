# imports components

The import wizard and the export panel, shown under **Household** as two pages:
`/household/import` (`ImportWizard`) and `/household/export` (`ExportPanel`), reached from the household menu.

The wizard (`import-wizard.tsx`) uses the shared `Stepper` (`components/ui/stepper.tsx`): Upload,
Columns, Values, Review, Import. One decision area per step. The batch id is in the URL (`?batch=`), so a
draft resumes at the right step; a started batch always shows step 5. Finished steps can be revisited;
for OFX the Columns step is disabled (fixed fields).

| Step | File | What it shows |
| --- | --- | --- |
| 1 Upload | `import-upload-step.tsx` | `UploadStep`: destination (account or card) then the drop zone. `UploadPreviewStep`: the file as written (`import-raw-table.tsx`), nothing guessed. |
| 2 Columns | `import-columns-step.tsx` | Required fields first, the rest under "More fields", date and number format, money-out values for a Type column, "remember this layout". Next stays disabled until date, description and amount are mapped. |
| 3 Values | `import-values-step.tsx` | Tabs for Merchants, Categories and Tags (only for mapped columns). One row per distinct value with a picker that can create the record in place; empty means no mapping. |
| 4 Review | `import-review-step.tsx` | KPIs, filters, the row table: Edit (description, merchant, category, tags) and Remove / Restore. |
| 5 Import | `import-run-step.tsx` | Progress, result KPIs, per-row result; reconciliation for OFX only. |

Shared pieces: `import-pickers.tsx` (account, card, merchant, category, tag pickers; the last three
share `InlineCreate`), `import-rows-table.tsx`, `import-row-dialog.tsx`, `import-status.tsx` (badges, the
one-line `IssueList`), `import-history.tsx`, `export-panel.tsx`.

Rules: data goes through `services/imports.service.ts`, `queries/imports` and `mutations/imports`; the
field list, date and number formats come from `@luraba/contracts` (`IMPORT_FIELDS`,
`IMPORT_DATE_FORMATS`), never redefined here; accounts, cards, merchants, amounts, categories and tags
are shown with `components/display/`. Sections use `DataBoundary` with `TableSkeleton` for loading and
retryable errors. All labels are English; the file's own text (descriptions) is shown as the data it is.
Errors stay short, one line per row.
