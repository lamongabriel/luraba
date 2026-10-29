# API test helpers

Run integration tests with `pnpm test:integration [path]` from `apps/api`. It loads `.env.test`
(`luraba_db_test`), migrates and resets the test database, and runs vitest with `RUN_DB_TESTS=1`.
Never run vitest with `RUN_DB_TESTS=1` yourself: without `.env.test` it points at the dev database.
Unit tests (`*.unit.test.ts`) run with `pnpm test:unit` and need no database.

| Helper | Use |
| --- | --- |
| `auth.ts` `createAuthenticatedContext({ role })` | A user, a household, the membership with the given role and a signed session cookie: `{ user, household, householdContext, token }`. |
| `auth.ts` `createAuthHeaders(token, householdId?)` | `Cookie` and `X-Household-Id` headers for supertest. |
| `factories.ts` | `createUser`, `createHousehold`, `createHouseholdMembership`, `setDefaultHousehold`, `build*Input` (account, merchant, category, tag, credit card, payment method), `buildHouseholdContext`. |

Pattern for an HTTP test:

```ts
const context = await createAuthenticatedContext();
const headers = createAuthHeaders(context.token, context.household.id);
const res = await request(app).post("/api/v1/categories").set(headers).send(buildCategoryInput());
expect(res.status).toBe(201);
```

Call services directly with `context.householdContext` to build fixtures quickly. Check both the
happy path and the cross-household case (another household's ids must be 404). Dates in tests should
be relative to now, not hard-coded.

External systems are replaced at the module boundary: uploads tests call
`setStorageForTesting(createMemoryStorage())`; email/push are not reached because the worker owns them.
