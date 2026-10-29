# API modules

One folder per domain, named in kebab-case. The categories and tags modules are the reference
implementations for a household-scoped CRUD module: copy their shape.

## Anatomy of a module

| File | Role |
| --- | --- |
| `<m>.routes.ts` | Express router. One line per endpoint: `requireAccess({ permission })` then the controller. Paths come from the contract (`getEndpointRouterPath`). |
| `<m>.controller.ts` | `createHouseholdHandler` / `createAuthenticatedHandler` wrappers: contract schemas in, service call, contract response out. No logic. |
| `<m>.service.ts` | Business rules. Takes a `HouseholdContext` first, throws typed errors, maps DB records to wire shapes (`formatISODateTime` for dates). Opens `db.transaction` when several writes must commit together. |
| `<m>.repository.ts` | SQL only. A class extending `HouseholdScopedRepository` exported as a singleton (`categoriesRepository`). |
| `<m>.query.ts` | Pure builders for list `where` / `order by` from the contract's list query (`buildIlikeSearch`, `inArrayIfAny`, `rangeConditions`, `buildOrderBy` from `shared/list`). |
| `<m>.types.ts` | `type XRecord = typeof table.$inferSelect`. |
| `__tests__/` | HTTP integration tests (supertest) and unit tests. |
| `README.md` | What the module owns, its rules and gotchas. Required. |

Split a service when it grows (`transactions.upcoming.service.ts`, `credit-card-cycles.service.ts`),
keeping one repository per aggregate.

## HouseholdScopedRepository

```ts
class CategoriesRepository extends HouseholdScopedRepository<CategoryRecord, CreateCategoryValues> {
  constructor() { super(categoriesTable, { orderBy: categoriesTable.name }); }
  // module-specific queries (always filter by context.householdId):
  async listPage(context, query) { ... }
}
export const categoriesRepository = new CategoriesRepository();
```

It provides `list`, `get(id, context)`, `create(context, values)`, `update(id, context, values)` and
`delete(id, context)`, all filtered by `context.householdId`. `create` fills `householdId`,
`createdAt` and `updatedAt`; `update` bumps `updatedAt`. The write methods and `get` take an
optional last `executor` argument so they can run inside a transaction:
`billsRepository.create(context, values, tx)`.

Use it for every table that has `id` and `household_id`. Do not use it for:
- tables with no household column (child rows such as bill occurrences, split participants): reach
  them through a parent loaded with `get`, which is what proves the household;
- rows that can be personal as well as household-owned (`uploads`, scope `user`);
- user-level data (notifications, preferences).

A scoped `update`/`delete` returns `undefined` when nothing matched: turn that into `NotFoundError`.

## Rules

- Services take `HouseholdContext` (`householdId`, `userId`, `role`, `timezone`, ...) and never read
  `req`. Authenticated-only (no household) services take a `userId`.
- Validate foreign ids (category, merchant, account...) through their repository's `get(id, context)`
  so another household's ids are rejected as not found.
- Money is an integer in minor units. Dates are `Date` in the DB and ISO strings on the wire.
- Side effects that must not break the request (notifications) go through
  `notifications.listeners.ts`/`notify`, never inline email or push code.
- Every module that owns files lists its attachment targets in the contracts registry and in
  `uploads.targets.ts` (see `uploads/README.md`).

## Module index

| Module | Owns |
| --- | --- |
| [accounts](accounts/README.md) | Bank/cash/investment accounts and their typed profiles |
| [auth](auth/README.md) | Current user and preferences (Better Auth routes live outside the REST contract) |
| [bills](bills/README.md) | Recurring bills and their occurrences |
| [budgets](budgets/README.md) | Monthly budgets |
| [categories](categories/README.md) | Income/expense categories (reference CRUD module) |
| [credit-cards](credit-cards/README.md) | Cards, billing cycles, purchases, installments, payments |
| [currencies](currencies/README.md) | Currency list and rates |
| [entries](entries/README.md) | Double-entry ledger entries |
| [fx](fx/README.md) | Exchange-rate providers and sync |
| [goals](goals/README.md) | Savings and investment goals, contributions and completion estimates |
| [health](health/README.md) | Health check |
| [households](households/README.md) | Households, members, roles, invitations |
| [integrations](integrations/README.md) | Third-party credentials (Brandfetch) |
| [ledger-accounts](ledger-accounts/README.md) | Ledger accounts backing entries |
| [mail](mail/README.md) | SMTP mail service and templates |
| [merchants](merchants/README.md) | Merchants |
| [notifications](notifications/README.md) | In-app notifications, preferences, delivery queueing |
| [onboarding](onboarding/README.md) | First-run options |
| [payment-methods](payment-methods/README.md) | Household payment methods |
| [reference-data](reference-data/README.md) | Countries, timezones |
| [splits](splits/README.md) | Shared purchases, participants, installments |
| [tags](tags/README.md) | Tags and tag assignment to transactions |
| [transactions](transactions/README.md) | The transaction feed, analytics and upcoming items |
| [uploads](uploads/README.md) | Files, the upload library and attachments |
