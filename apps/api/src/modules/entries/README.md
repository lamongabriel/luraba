# entries

Double-entry ledger entries (`entries.repository.ts`, `entries.service.ts`). Internal: no HTTP routes.

## Rules

Every money movement is a balanced set of entries. Create them through this module, never by inserting into the table directly.

General module conventions: [../README.md](../README.md).
