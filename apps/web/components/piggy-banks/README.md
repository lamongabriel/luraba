# components/piggy-banks

UI for piggy banks (savings buckets inside a cash account, Nubank Caixinhas style). Design and ledger decision:
[docs/piggy-banks.md](../../../../docs/piggy-banks.md); API: [piggy-banks module](../../../api/src/modules/piggy-banks/README.md).

| Page / file | Role |
| --- | --- |
| `app/(app)/piggy-banks/page.tsx` | One summary row per account (in piggy banks, free balance) and the grid of cards. Header counters: in piggy banks and earned this month (combined across currencies). "Show archived" switch. States in `_loading`, `_error`, `_empty`; the skeleton is one account row plus six cards (`piggy-bank-layout.ts`). |
| `app/(app)/piggy-banks/[id]/page.tsx` | Detail: four KPIs (balance, net if withdrawn today, earned this month, earned in total), the 12-month projection and the movements list. `_loading` / `_error` render the whole header. |
| `piggy-bank-card.tsx` | One card; the menu has Deposit, Withdraw, Move, Set real balance, Edit, Full details and Archive / Restore (by permission). |
| `piggy-bank-sheet.tsx` | Create/edit form: name, account (create only), cover preset, emoji, yield (type, rate, maturity, liquidity, taxes, IOF) and the starting balance (create only). |
| `piggy-bank-funds-modal.tsx` | Deposit / Withdraw / Move / Set real balance in one modal. A deposit can be split across the account's piggy banks (one transfer). Amounts are typed in major units and converted with `majorToMinorUnits`. |
| `piggy-bank-movements.tsx` | The movements as `ListRow`s (the same list on every screen size, so no table to convert on mobile). |
| `piggy-bank-projection-chart.tsx` | `AreaChartCard`: balance with interest against deposits only. |
| `goal-piggy-banks.tsx` | On `/goals/[id]`: linked piggy banks, the three plan modes with scenario sliders (the same `@luraba/domain` maths as the API, re-run in the browser), the projection and planned vs actual by month with the catch-up amount. |
| `account-piggy-banks.tsx` | Side panel on a cash account's page: free balance plus its piggy banks. |

Rules: piggy banks are shown with `PiggyBankDisplay` / `PiggyBankMark` ([display](../display/README.md)), money with
`AmountDisplay`. Every write goes through `mutations/piggy-banks` and refreshes piggy banks, accounts, transactions
and goals. A linked goal's contribution endpoints return 409; link and unlink from the goal page.

Known limitations: the account page panel loads its own data, so its skeleton is inside the panel rather than in the
page's `_loading.tsx` (it only exists for cash accounts, which the page does not know until loaded). The cover upload
(`piggy_bank` target) is supported by the API; the sheet offers presets and an emoji only.
