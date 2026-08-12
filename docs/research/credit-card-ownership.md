# Credit Card Ownership Research

Luraba models a credit card as a liability product attached to a cash owner account, while retaining a separate internal ledger for card activity. The owner relationship reflects the real-world account relationship without restricting payments to that account: any same-currency asset account can pay the card.

Billing cycles should keep statement closing and payment due dates as separate values. The Consumer Financial Protection Bureau describes the billing-cycle statement and the later payment due date as distinct parts of credit-card billing, so Luraba exposes both rather than treating the due date as the closing date.

Source: [CFPB Regulation Z, 12 CFR 1026.5](https://www.consumerfinance.gov/rules-policy/regulations/1026/2024-01-01/5/)

## Local migration note

Migration `0030_credit_card_ownership` is intentionally breaking for this pre-production application. Reset the local PostgreSQL database and run the normal migration and seed commands when upgrading a database created before this migration; existing local card data is disposable because ownership cannot be inferred safely from the former card-to-ledger relationship.
