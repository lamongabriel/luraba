# accounts

Bank, cash, investment and other accounts. `accounts.profiles.repository.ts` stores the typed profile per account type.

## Rules

Extends `HouseholdScopedRepository`. Balances come from ledger entries, not a stored column. Account images attach through the `account` target (role `image`). `imageUploadId` points at an image upload of the same household (validated by `assertAccountImage`, `null` clears it); the web `AccountDisplay` prefers it over the institution logo. Apply migration `0037_account_image` with `pnpm --filter @luraba/api db:migrate`.

General module conventions: [../README.md](../README.md).
