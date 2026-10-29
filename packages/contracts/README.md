# @luraba/contracts

The public HTTP boundary: endpoint definitions, request schemas, response resources, wire types and
the permission model. Used by `apps/api` (to validate and shape responses) and `apps/web` (to call
the API and type results). Zod schemas are the single source of truth; do not hand-write types.

## Layout

```
src/<module>/
  endpoints.ts   defineEndpoint({ method, path, params?, query?, body?, response, meta?, status })
  requests.ts    zod schemas for params / query / body (+ z.input types for callers)
  resource.ts    zod schemas for response resources (+ z.output types)
  operations.ts  EndpointResult<...> aliases for the web services
  index.ts       re-exports
src/registry.ts  every module's endpoints (`allEndpoints`, `contractModules`)
src/permissions.ts  PERMISSIONS and the per-role permission lists
src/api.ts, list.ts, common.ts  envelope, pagination, shared schemas
```

Each module is also a package export (`@luraba/contracts/categories`); add the export to
`package.json` for new modules.

## Rules

- Every non-204 endpoint has a `response` schema; paths with `:param` have a `params` schema.
- Lists use `listMetaSchema()` as `meta` and a query built on the base list query.
- Dates cross the wire as ISO strings (`wireDateTimeSchema`); money as integer minor units.
- Adding an endpoint: define it, register it in `registry.ts`, and update the expected module counts
  and endpoint order in `src/__tests__/contracts.test.ts`.
- Adding a permission: add the key to `PERMISSIONS` and to the role lists in `permissions.ts`.
- Rebuild after changes so dependents see them: `pnpm --filter @luraba/contracts build` (the dev
  watchers do this).
- Endpoints that stream bytes (upload, download) are deliberately not contracts.

## Uploads registry

`src/uploads/catalog.ts` holds `ATTACHMENT_TARGETS`: for each record type (user, household, merchant,
account, credit_card, category, transaction, bill, split) the roles it accepts, `one` or `many`, and
the allowed file kinds. See `apps/api/src/modules/uploads/README.md`.
