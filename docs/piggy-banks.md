# Piggy banks

A piggy bank (Nubank "Caixinha", Inter "Porquinho") is a named savings bucket **inside one real
account**. It holds part of that account's balance, earns interest every day, and can be linked to goals.
This page is the design; the module READMEs hold the rules per layer:
[API module](../apps/api/src/modules/piggy-banks/README.md),
[web components](../apps/web/components/piggy-banks/README.md),
[domain maths](../packages/domain/src/piggy-banks.ts) (unit tested).

## 1. Model

| Table | What it holds |
| --- | --- |
| `piggy_banks` | household, `parent_account_id`, title, description, cover (upload, preset or emoji), color, currency, yield config, `accrued_through`, `archived_at`. |
| `piggy_bank_movements` | signed amounts that make the balance: `opening`, `deposit`, `withdrawal`, `transfer_in`, `transfer_out`, `interest`, `adjustment`. Optional `transaction_id`, `group_id` (bulk moves), `estimated`. |
| `piggy_bank_accruals` | one row per piggy bank and day: opening balance, exact (fractional) interest, carry, posted amount, factor, estimated. Primary key `(piggy_bank_id, accrual_date)` makes the daily job idempotent. |
| `goal_piggy_banks` | goal <-> piggy bank links. |
| `goals.plan_*` | none: the three plan modes already exist on goals (see section 6). |

Yield config on the piggy bank: `yieldType` (`cdi_percent`, `selic_percent`, `ipca_plus`, `fixed_rate`,
`none`), `yieldRate` (a percentage: 102 = 102% of CDI; 6.5 = IPCA + 6.5% a.a.; 12 = 12% a.a.),
`dayCount` (252 business days for CDI/Selic, 365 otherwise, overridable), optional `maturityDate`,
`liquidity` (`daily` / `at_maturity`), `taxRegime` (`none` / `regressive_ir`) and `applyIof`.

## 2. Ledger representation (decision)

The task proposed "a ledger account per piggy bank". **We do not do that.** A real bank keeps one
balance per account and the buckets are bookkeeping inside it, which is also how goals already work
in Luraba (`goal_contributions` with locations, not ledger accounts). A ledger account per piggy bank
would have forced every report, feed and account query that joins `ledger_accounts.owner_type =
'account'` to learn a new owner type, with a high risk of leaking piggy banks into the transaction
feed. Instead:

- The parent account's single ledger account is the **real** balance. The piggy banks are
  sub-balances computed from `piggy_bank_movements`.
- **Parent balance = free balance + sum of its piggy banks** with `free = account balance - sum(piggy balances)`.
  Both are shown. `free` can go negative if the account is spent below the sum of its buckets; it is
  shown as such, never hidden.
- **Deposit** from another account X: a normal `transfer` X -> parent (neutral in spending and income
  reports) plus a `deposit` movement. Deposit from the parent's free balance: only the movement.
- **Withdraw** to another account Y: `transfer` parent -> Y plus a `withdrawal` movement; to free
  balance: only the movement. Withdrawing more than the piggy holds is refused.
- **Move between piggy banks**: two movements (`transfer_out` / `transfer_in`) sharing a `group_id`;
  no transaction, nothing in the ledger changes.
- **Bulk move** (one Pix split across piggy banks): one transfer of the total plus one `deposit`
  movement per piggy bank, all with the same `transaction_id` and `group_id`; the amounts must sum to
  the transfer.
- **Interest**: an `income` transaction on the parent account (category *Investment Income > Interest*,
  created on first use) per piggy bank per accrual day, plus an `interest` movement with
  `estimated = true`. It counts as income in reports because it is income.
- **Set real balance** (`set_balance`): the difference to the computed balance becomes an `adjustment`
  transaction on the parent account (the existing adjustment flow, never counted as money in/out) and
  an `adjustment` movement. All earlier `estimated` interest movements are marked confirmed and the
  fractional carry is reset ("recalibrate"): the next accrual starts from the real balance.
- **Archive**: only a piggy bank with a zero balance, `409` otherwise. Unallocated piggy banks too.

Accounts of another currency than the piggy bank are refused: a piggy bank has the parent's currency.

## 3. Accrual

Pure maths in `@luraba/domain` (`piggy-banks.ts`):

- `dailyFactor` for a day: `cdi_percent` = `1 + CDI_day * pct` (CDI daily is the published
  percentage-per-day from BCB SGS 12); `selic_percent` likewise with SGS 11; `ipca_plus` =
  `(1 + IPCA_month)^(1/bd_in_month) * (1 + rate)^(1/252)` on business days (365 days: calendar days);
  `fixed_rate` = `(1 + rate)^(1/basis)`. Compounding is daily on the running balance.
- 252-basis products accrue **only on business days**; 365-basis products accrue every calendar day.
- Missing index values (not published yet) fall back to the last published value as a projection and
  the accrual is flagged `estimated`. The macro job fills the real value later, but accruals already
  posted are not rewritten: the next `set_balance` recalibrates.
- The holiday calendar is the ANBIMA national calendar from `@luraba/domain` (`BusinessCalendar`,
  rows in `holiday_calendar` win when present). Limits: regional or one-off closures are not
  generated, add them to the `holiday_calendar` table.
- Fractions are carried: the day's exact interest is `balance * (factor - 1)`; the posted amount is
  `floor(carry + exact)` in minor units and the remainder is carried to the next day, so tiny
  balances do not lose interest to rounding.

**Index rates** are not stored twice. The market-data module already syncs CDI (SGS 12), Selic (11)
and IPCA (433) from the BCB into `macro_index_values` through an injectable `HttpFetch`, with history
back to 2000 and a missing-tail backfill (`MarketDataService.syncMacro`, job `sync-macro` in
`apps/api/src/modules/investments`). Piggy banks read those rows. Overlap decision: no second
index table, no second fetcher.

**The job.** `piggy-banks.accrual.service.ts` (`accruePiggyBanks({ today, ... })`) walks every active
piggy bank with a yield from `accrued_through + 1` (or the first movement) up to **yesterday** (a
day's CDI is published after the day ends), one day at a time, in one DB transaction per piggy-bank
day. A day already in `piggy_bank_accruals` is skipped, so re-running a day never credits twice and a
backfill after downtime is just "run it again". It is scheduled through `@luraba/queue`
(`PIGGY_BANK_JOBS.accrue`, daily) and consumed next to the market-data consumer in the API process,
because it posts ledger transactions through the transactions service. (The worker app cannot import
API services; the investments macro jobs follow the same pattern.) It also runs on API boot after the
macro warm-up and through `POST /piggy-banks/accrue` for the owner.

## 4. Net if withdrawn today

`netIfWithdrawn` in the domain package uses the lots of the piggy bank (every positive movement
that is principal: opening, deposit, transfer_in; withdrawals consume lots FIFO) and the existing
`fixedIncomeRedemptionTax` / `TaxRules` (regressive IR 22.5 / 20 / 17.5 / 15% by holding days and IOF
table for the first 30 days, read from `tax_rules` or the shipped defaults). The accrued gain is
split between lots proportionally to `principal x days held`. With `taxRegime: none` net = gross.
This is an estimate: it ignores come-cotas-like fund rules and is not tax advice.

## 5. Movements and earnings

`GET /piggy-banks/:id` returns balance, gross, `netIfWithdrawn`, earnings today / month / all time
(sum of `interest` movements by date), the movements list (paged separately) and the linked goals.

## 6. Goals

A goal can link to piggy banks (`goal_piggy_banks`, `PUT /goals/:id/piggy-banks`). When a goal has
links, **progress = sum of the linked piggy balances (interest included) converted to the goal currency**
with the FX service; the contribution endpoints refuse linked goals (`409`, the piggy banks are the
source of truth). Goals without links are unchanged.

The three plan modes already exist on goals and map one to one:

1. target amount by date (no monthly) -> required monthly deposit;
2. monthly amount (no date) -> projection and the date the target is reached;
3. monthly amount + `endMonth` -> projected final value.

The yield-aware maths (`planWithYield`, `projectWithYield`, `requiredMonthlyWithYield`) is new, pure and
unit tested; the effective yearly rate is the balance-weighted effective annual rate of the linked
piggy banks (`effectiveAnnualRate`), or the goal's `expectedReturnBps`. `GET /goals/:id/piggy-plan`
returns, per month, planned vs actual deposits (deposits minus withdrawals into the linked piggy
banks, interest and adjustments excluded), on-track / behind and the catch-up amount, and the
projection series with the target line. Scenario sliders in the UI re-run the same pure maths in the
browser, so no request per slider move.

## 7. Migration of "Nubank Caixinhas"

The schema migration (`0058_piggy_banks`) only creates tables; **it does not touch data**, because
production must not change until the owner decides. The data step is an idempotent script:

```bash
pnpm --filter @luraba/api piggy:adopt -- --household <id> [--account "Nubank Caixinhas"] [--dry-run]
```

For the named account (default "Nubank Caixinhas", matched case-insensitively, `--dry-run` prints
what would happen) in that household, if no piggy banks exist for it yet, it creates one
**Unallocated** piggy bank (no yield) with an `opening` movement equal to the account's current
balance. Re-running does nothing. It never assumes the account exists (prints a message and exits 0).
The same command takes `--account "Inter Porquinho"` later. Splitting is then done in the UI or MCP
with "move between piggy banks" (Louise iPhone money, Land, Car maintenance, IPVA, Tesouro
Prefixado 2032 with `fixed_rate` + maturity 2032, Emergency fund).

## 8. API, MCP and UI

Endpoints are defined once in `packages/contracts/src/piggy-banks` and listed in the contracts
inventory test. Permissions: `piggyBanks.read` / `.create` / `.update` / `.delete` (owner and admin all;
member read, create, update; viewer read). MCP tools: `list_piggy_banks`, `create_piggy_bank`,
`update_piggy_bank`, `archive_piggy_bank`, `deposit_to_piggy_bank`, `withdraw_from_piggy_bank`,
`move_between_piggy_banks`, `set_piggy_bank_balance`, `link_goal_to_piggy_bank`, `report_piggy_banks`
(major units; `dryRun` on writes, `confirm` on archive). UI: `/piggy-banks` grid, `/piggy-banks/[id]`
detail, create/edit sheet, deposit / withdraw / move sheet with bulk split, goal pages with links and
plan modes, parent account detail with free balance + piggy banks. See the component README.
