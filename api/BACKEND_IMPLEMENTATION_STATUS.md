# Luraba Backend Implementation Status

## 1. What the project is about

Luraba is a personal finance backend designed for heavy credit-card usage with Brazilian billing behavior.

The backend is being built to support:

- Multiple bank accounts per user
- Credit cards attached to accounts (card is not an account)
- Billing cycles (fatura), current and future
- Installments (parcelamento) across future cycles
- Limit tracking including future commitments
- Budgets by purchase month (not posted date)
- Dashboard and cash-flow by posted date
- Transfers that do not count as regular expenses
- Multi-currency foundations
- Internal double-entry accounting safety

Architecture principle: user-facing domain objects and internal ledger are separated. Ledger stays internal, while API returns domain-oriented views for UI.

---

## 2. What has been done

## 2.1 Schema foundation implemented

The following finance and ledger schema files were added and exported:

- src/db/schemas/finance-enums.schema.ts
- src/db/schemas/currencies.schema.ts
- src/db/schemas/exchange-rates.schema.ts
- src/db/schemas/accounts.schema.ts
- src/db/schemas/credit-cards.schema.ts
- src/db/schemas/ledger-accounts.schema.ts
- src/db/schemas/categories.schema.ts
- src/db/schemas/tags.schema.ts
- src/db/schemas/transactions.schema.ts
- src/db/schemas/entries.schema.ts
- src/db/schemas/budgets.schema.ts
- src/db/schemas/billing-cycles.schema.ts
- src/db/schemas/installments.schema.ts
- src/db/schemas/installment-items.schema.ts
- src/db/schemas/card-payments.schema.ts
- src/db/schemas/transaction-tags.schema.ts

Schema export wiring updated in:

- src/db/schema.ts

### Current model notes

- Amount storage uses BIGINT minor units.
- Entries use signed amounts.
- Credit card cycles are modeled separately from user transactions.
- Budget month is represented explicitly.
- Multi-currency base entities and FX table exist.

## 2.2 Migration generated

Drizzle migration generated successfully:

- drizzle/0000_chief_thunderbird.sql

## 2.3 Accounts module implemented

Added accounts module with route/controller/service/repository/types:

- src/modules/accounts/accounts.routes.ts
- src/modules/accounts/accounts.controller.ts
- src/modules/accounts/accounts.service.ts
- src/modules/accounts/accounts.repository.ts
- src/modules/accounts/accounts.types.ts

Implemented behavior:

- CreateAccount flow
- List accounts by user
- Automatic ledger account creation for each newly created account

## 2.4 Credit cards module implemented

Added credit card module with route/controller/service/repository/types:

- src/modules/credit-cards/credit-cards.routes.ts
- src/modules/credit-cards/credit-cards.controller.ts
- src/modules/credit-cards/credit-cards.service.ts
- src/modules/credit-cards/credit-cards.repository.ts
- src/modules/credit-cards/credit-cards.types.ts

Implemented behavior:

- CreateCreditCard flow
- Automatic liability ledger account creation for card
- Automatic billing cycle generation (12 months ahead)
- GET card overview endpoint with limit totals and cycle list

## 2.5 App routing updated

New route mounts in:

- src/app.ts

Mounted endpoints:

- POST /api/v1/accounts
- GET /api/v1/accounts?userId=...
- POST /api/v1/cards
- GET /api/v1/cards/:id/overview?userId=...

## 2.6 Validation done

- TypeScript build passes.
- Drizzle schema generation passes.
- No backend diagnostics reported after this implementation slice.

---

## 3. What needs to be done next

## Priority 1: complete write-path financial services

1. Implement CreateCardPurchase
- Resolve billing cycle by purchase date and card closing rules.
- Create user transaction envelope.
- Write balanced double-entry rows.
- Set budget_month based on purchase month.
- Associate entry with billing_cycle_id.

2. Implement CreateInstallmentPurchase
- Split amount into N installments with deterministic minor-unit rounding.
- Create installment and installment_items.
- Map each installment item to future billing cycles.
- Ensure committed card limit includes all unpaid future installments.

3. Implement PayCardCycle
- Record payment transaction from asset account to card liability ledger.
- Create card_payments linking table row.
- Keep structure ready for future partial-allocation rules.

## Priority 2: complete read-path services and views

4. Implement GetCardLimit and finalize GetCardOverview
- Include current cycle, future cycles, past cycles.
- Include itemized cycle entries and payments.
- Include installment projections in overview.

5. Implement GetAccountBalance and account history
- Asset-side history only.
- Card purchases should not appear as account expense movement.
- Card payment transfer should appear in account movement.

6. Implement GetBudgetUsage
- Group by category and month using entries.budget_month.
- Keep budget currency strict for this phase.

7. Implement GetDashboard
- Aggregate by posted_date.
- Exclude transfer flows from expense totals.
- Focus on asset-account cash-flow semantics.

8. Implement GetFutureBills
- Aggregate open/future cycle totals and unpaid installment items.

## Priority 3: correctness safeguards

9. Add balance invariant enforcement
- Enforce sum(entries.amount) == 0 per transaction per currency.
- Use service-level validation now, then optional DB trigger hardening.

10. Enforce entry immutability policy
- No manual update/delete of accounting entries.
- Corrections must be reversal transactions.

11. Add tenant isolation hardening
- Replace query userId pattern with authenticated request user context.
- Ensure every read/write is user-scoped through middleware/service checks.

## Priority 4: testing and operational readiness

12. Add integration tests for end-to-end flows
- account creation
- card creation + cycle generation
- card purchase
- installment purchase
- cycle payment
- dashboard and budget aggregations

13. Add unit tests for date and cycle edge cases
- month length boundaries 28/29/30/31
- due day and closing day clamping
- timezone consistency
- installment rounding distribution

14. Add seed/bootstrap scripts
- currencies bootstrap
- base categories bootstrap
- optional system ledger accounts bootstrap

---

## 4. Recommended immediate execution order

If continuing now, implement in this exact order:

1. CreateCardPurchase
2. CreateInstallmentPurchase
3. PayCardCycle
4. GetFutureBills
5. GetBudgetUsage
6. GetDashboard
7. Account history/balance query model hardening
8. Integration tests

This order unlocks the highest-value backend behavior first (card flows and future bills), then closes reporting/budget/dashboard requirements.

---

## 5. Current implementation boundaries

Out of scope for current phase (already agreed):

- Partial card payment allocation rules
- Interest and late-fee accrual
- Refunds and chargebacks

The current design leaves room to add these later without breaking existing core entities.

Next implementation step options

Implement CreateCardPurchase + double-entry writer + cycle resolution (purchase_date based).
Implement CreateInstallmentPurchase with rounding-safe split and future cycle allocation.
Implement PayCardCycle + card_payments linkage and prepare for partial allocation later.
Add integration tests for account creation, card creation, and cycle generation first.
Reply with 1, 2, 3, or 4 and I will continue immediately.