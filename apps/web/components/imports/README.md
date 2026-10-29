# imports components

The import wizard and the export panel, shown in **Settings > Import & export**
(`app/(app)/settings/import-export/page.tsx`). There is no sidebar entry.

- `import-export-settings.tsx`: the page body (history, new import, export).
- `import-upload-step.tsx`: step 1, upload and preview of the first rows, choose the target.
- `import-map-step.tsx`: step 2, group mappings (account, merchants, categories, tags) and the row
  table with filters and skip controls. `import-rows-table.tsx` / `import-row-dialog.tsx` edit one row.
- `import-run-step.tsx`: step 3, progress, result summary, reconciliation and the result list.
- `import-pickers.tsx`: account, card, merchant (with create in place), category and tag pickers.
- `import-status.tsx`, `import-history.tsx`: badges and the batch list.
- `export-panel.tsx`: the exporter list with date range and download buttons.

Rules: data goes through `services/imports.service.ts`, `queries/imports` and `mutations/imports`;
accounts, cards, merchants, amounts, categories and tags are shown with `components/display/`.
All labels are English; bank text (descriptions) is shown as the raw data it is.
