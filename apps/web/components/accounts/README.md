# Accounts UI

The accounts list (`app/(app)/accounts`) and the account detail page (`app/(app)/accounts/[id]`).

## Account sheet

`AccountSheet` creates or edits an account (`components/forms/create-edit-account-form`). In **edit**
mode it also holds the **Manage** section (`account-manage-section.tsx`): *Adjust balance* (opens
`AdjustAccountBalanceSheet`, an auditable adjustment transaction) and *Delete* (shared `ConfirmDialog`).
Neither action is a button on the detail page. The list opens the sheet from each row's edit button;
the detail page from its header. `onDeleted` lets the page react (the detail page goes back to the list).

The form dates use the shared calendar picker (`FormItem inputType="date"`), the loan rate is a
`FormItem inputType="decimal" max={100} suffix="%"`. Bounds live in `@luraba/contracts`
(`MAX_LOAN_TERM_MONTHS`, `MAX_PROPERTY_AREA`, `MAX_VEHICLE_MILEAGE`) and are enforced by the contract
and by the form schema. Pairs must come together: payment amount with frequency, area with unit,
mileage with unit.

## Detail page

Designed as one screen, on a 3-column grid (`account-detail-layout.ts`). Nothing is a card inside a
card and no table sits in a card; the page itself carries the main content.

```
header   [mark] Name · Institution · Type · CUR ......... [Period ▾] [Edit]
main 2/3  Current balance  $12,345.00   [↑ in] [↓ out]    side 1/3  Credit cards (cash)
          flat balance chart (no card)                              Loan outlook (loan)
          key figures strip (5, hairlines)                          Expenses by category
          Cash flow                                                 Top merchants
          Recent transactions (table on the page)                   Upcoming charges (fills the rest)
details   labeled grid, only when it adds information (loan terms, property, vehicle, wallet, notes)
```

The grid uses `items-stretch` and the side column is a flex column whose last panel (`fill`) takes the
leftover height, so both columns end together. Spacing follows `docs/design-language.md`
(`gap-8`/`gap-10`, `space-y-10`).

One period control (`usePeriodFilter` + `PeriodFilter`: a single popover, presets beside a calendar)
drives the page. There is no "created by" line.

| Section | Component | Source |
| --- | --- | --- |
| Header | `InternalPageLayout` + `AccountMark`, `getAccountFullDetail` | `GET /accounts/:id` |
| Balance, in/out chips, flat chart | `AccountOverview` (`AreaChartCard flat`) | account + insights |
| Key figures (net, spent, daily average, upcoming, savings rate) | `AccountStats` (`KpiStrip`) | insights + upcoming |
| Recent transactions | `AccountRecentTransactions` (the transactions table's columns, minus Account) | `GET /accounts/:id/transactions` |
| Cash flow (main), expenses by category (side) | `account-charts.tsx` | insights |
| Top merchants | `AccountTopMerchants` | insights + merchants |
| Credit cards paid from the account (only when it has some) | `AccountCreditCards` | credit cards + overview |
| Loan outlook (loans) | `AccountLoanOutlook` (`summarizeLoan`) | account terms |
| Upcoming charges (30 days) | `AccountUpcoming` | `GET /transactions/upcoming?accountIds=` |
| Details and notes (no section when empty; the subtype is already in the header) | `AccountDetailsSection` | account |
| Open in Investments (investment accounts) | header action | account |

`AccountDetailSkeleton` (`_loading.tsx`) mirrors the grid with the same constants. The credit cards, loan
outlook and details exist only for some accounts, so the skeleton omits them; the cards sit at the top of the side column and details below the grid. The tab title is `Account | Luraba` from `generateMetadata`, then `<name> | Luraba`
through `usePageTitle` once the account loads.
