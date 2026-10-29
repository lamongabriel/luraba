# API shared building blocks

| Path | What it gives you |
| --- | --- |
| `controllers/controller.ts` | `createHandler`: parses `params`/`query`/`body` with zod, runs `handle`, validates the result against the contract's `response` (and `meta`), sends the envelope. `status: "created"` -> 201, `"no-content"` -> 204. |
| `controllers/household.controller.ts` | `createHouseholdHandler`: same, and passes `household` (the `HouseholdContext` set by `requireAccess`) to `handle`. Use for every household route. |
| `controllers/authenticated.controller.ts` | `createAuthenticatedHandler`: passes `user` instead. Use for user-level routes (profile, notifications, personal uploads). |
| `repositories/household-scoped.repository.ts` | `HouseholdScopedRepository`: household-filtered get/list/create/update/delete, with an optional transaction executor. See `modules/README.md`. |
| `repositories/repository.ts` | `Repository`: the same without a household filter, for global tables (currencies, reference data). |
| `list.ts` | Pagination and list-query helpers: `getPagination`, `createListMeta`, `buildIlikeSearch`, `inArrayIfAny`, `rangeConditions`, `nullabilityCondition`, `buildOrderBy`, `combineConditions`; types `ListResult`, `DbListPage`. |
| `response.ts` | Envelope helpers (`sendSuccess`, `sendCreated`, `withApiMeta`). A handler returns `withApiMeta(data, meta)` for list responses. |
| `errors.ts` | `AppError` subclasses: `NotFoundError`(404), `ValidationError`(422), `ConflictError`(409), `UnauthorizedError`(401), `ForbiddenError`(403), `DependencyUnavailableError`(503), plus `isUniqueViolation(error)` for catching a Postgres unique-index violation (Drizzle wraps the driver error, so the SQLSTATE is on `cause`; never test `error.code` directly). Throw these from services; `middleware/error.middleware.ts` renders them. |
| `logger.ts` | pino logger. |
| `lib/` | Better Auth instance and auth origins. |
| `data/` | Static location data (countries, timezones). |

## Conventions

- A controller's `handle` returns the service value as is; the contract's response schema is the
  runtime boundary, so a service returning a wrong shape fails loudly in tests.
- Raw, non-JSON routes (file download, multipart upload) are written as plain Express handlers and
  are the only endpoints outside the contract registry (see `modules/uploads/README.md`).
- Do not catch errors in controllers; `createHandler` forwards them to the error middleware.
