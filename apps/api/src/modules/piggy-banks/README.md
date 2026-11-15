# Piggy banks module

Named savings buckets inside one `cash` account (Nubank "Caixinhas"). Design and ledger decision:
[docs/piggy-banks.md](../../../../../docs/piggy-banks.md). Read it first.

## Rules

- **No ledger account per piggy bank.** Balances are sums of `piggy_bank_movements`; the parent account's
  ledger account stays the real balance. `free = account balance - sum(piggy balances)`.
- Layering as everywhere: routes -> controller -> service -> repository. `PiggyBanksRepository` extends
  `HouseholdScopedRepository`; movements, accruals and goal links have no household column and are always
  reached through a piggy bank loaded with `requirePiggyBank`.
- Money amounts are minor units. Any write that touches the ledger runs in one DB transaction and
  compensates (`undoTransfer`) if a later step fails.
- Archive only at a zero balance (409). The parent must be a `cash` account in the piggy bank's currency.
- `coverUploadId` is checked with `assertHouseholdImageUpload`; the upload target is `piggy_bank`.

## Files

| File | Role |
| --- | --- |
| `piggy-banks.service.ts` | list/overview, detail, create/update/archive, movements, report |
| `piggy-banks.funds.service.ts` | deposit, bulk deposit, withdraw, move, set real balance (`postAdjustment` is local: the account adjustment helper ignores same-day transactions) |
| `piggy-banks.accrual.service.ts` | `accruePiggyBanks`: idempotent daily interest, carry, estimated flag, interest transaction |
| `piggy-banks.jobs.ts` | `runDailyAccrual`: macro sync then accrual; scheduled as `MARKET_DATA_JOBS.piggyAccrue` |
| `piggy-banks.goals.service.ts` | goal links, linked progress (FX), yield-aware goal plan |
| `piggy-banks.adopt.ts` | idempotent "adopt an account into an Unallocated piggy bank" |
| `piggy-banks.shared.ts` | yield config helpers, loaders, free balance |

## Accrual job

Runs in the API process (like the investments market-data jobs) because it posts ledger transactions through
API services, which the worker app cannot import. Triggers: the queue schedule (every 6 hours, finished days
are skipped), API boot via the investments jobs, and `POST /piggy-banks/accrue`. The primary key
`(piggy_bank_id, accrual_date)` on `piggy_bank_accruals` makes re-runs safe.

## Goals

Linked goals take `saved` from the linked balances (FX converted); `POST/DELETE` contributions return 409 for
them. See the goals README. `GET /goals/:id/piggy-plan` returns planned vs actual, catch-up and the
projection series.

## Adopting an account

```bash
pnpm --filter @luraba/api piggy:adopt -- --household <id> [--account "Nubank Caixinhas"] [--dry-run]
```

Creates one `Unallocated` piggy bank (no yield) with an `opening` movement equal to the balance. Re-running
does nothing; a missing account exits 0.

## Tests

`__tests__/`: `piggy-banks.http.test.ts` (CRUD, funds, permissions), `piggy-banks.accrual.test.ts` (accrual,
idempotency, job, adopt), `piggy-banks.goals.test.ts`. Run with `pnpm test:integration src/modules/piggy-banks`
from `apps/api`.
