# Luraba Shared Context

Luraba is a personal finance product. The API is the source of truth for domain rules, persistence, authentication, and external integrations. The UI consumes API contracts and owns presentation, navigation, and browser state.

## Credit Cards

- A credit card is a first-class liability product with its own hidden ledger account.
- `ownerAccountId` points to the household cash account that owns the card and supplies its immutable currency.
- `ledgerAccountId` points to the internal liability ledger account and is not a normal user-facing account.
- One cash account may own many credit cards. A payment may come from any same-currency asset account; ownership only provides the default source and real-world relationship.
- Statement closing dates and payment due dates are separate lifecycle events. Current statements describe the active billing period; next statements describe the following period.
