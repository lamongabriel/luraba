# accounts

Bank, cash, investment and other accounts. `accounts.profiles.repository.ts` stores the typed profile per account type.

## Rules

Extends `HouseholdScopedRepository`. Balances come from ledger entries, not a stored column. Account images attach through the `account` target (role `image`). `imageUploadId` points at an image upload of the same household (validated by `assertAccountImage`, `null` clears it); the web `AccountDisplay` prefers it over the institution logo. Apply migration `0037_account_image` with `pnpm --filter @luraba/api db:migrate`.

## Insights

`GET /accounts/:id/insights?dateFrom&dateTo` (`accounts.insights.service.ts`, raw SQL in `accounts.insights.repository.ts`) powers the account page: opening and closing balance, money in / out / net / spent, a comparison with the previous period of the same length, balance history and cash flow bucketed by day, week or month, expenses by category, top merchants and the largest expense. It works from the account's own ledger entries, in the account's currency (no FX), with the account's displayed sign (a liability's "money in" is debt added). `adjustment` transactions move the balance history but never count as money in, out or spent. Dates are clamped to the household's today; no `dateFrom` means since the first entry. Needs `transactions.read`. The queries qualify every column (AGENTS.md rule 7).

Loan, property and vehicle details are validated in `@luraba/contracts` (`accounts/profiles.ts`): interest 0 to 100 %, term 1 to 1200 months, payment amount needs a frequency, area and mileage need their unit.

General module conventions: [../README.md](../README.md).
