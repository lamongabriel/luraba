# accounts

Bank, cash, investment and other accounts. `accounts.profiles.repository.ts` stores the typed profile per account type.

## Rules

Extends `HouseholdScopedRepository`. Balances come from ledger entries, not a stored column. Account images attach through the `account` target (role `image`).

General module conventions: [../README.md](../README.md).
