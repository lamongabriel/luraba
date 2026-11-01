# API keys + MCP server: checklist

Resume point for the unattended build. Tick items as they are done and verified.

## Phase 1: API keys

- [x] Better Auth API key plugin (`@better-auth/api-key`, pinned with `better-auth` at 1.6.33), prefix `lur_`, hashed storage, per-key rate limit (600/min)
- [x] `api_keys` table: hand-written migration `0051_api_keys.sql`, journal entry, `packages/db` schema
- [x] Auth middleware: session OR `Authorization: Bearer lur_...` / `x-api-key`; key resolves to its owner, then the same household + `requireAccess` path
- [x] Management endpoints (contract first, `apiKeys` module): list, create, update (label / enable / disable), delete; session only
- [x] Contract inventory test updated
- [x] API integration tests (create/list/revoke/delete, role permissions, expired/deleted/revoked, foreign household, secret never listed, rate limit, keys cannot manage keys)
- [x] Web UI `/settings/api-keys` (list, create sheet, one-time secret modal, inline rename, revoke switch, delete confirm, loading/error/empty states)
- [x] Docs: module README, `docs/api-keys-mcp/api-keys.md`, `docs/architecture.md`, AGENTS.md table, web README
- [x] Verify (typecheck, check, test, integration), commit, rebase, push

## Phase 2: MCP server

- [x] Study Nexus MCP server structure
- [x] `apps/mcp` scaffold (workspace, tsconfig, biome, turbo tasks)
- [x] Contract-based API client, config validation, safe logging
- [x] Transaction tools (search/get/create/update/delete, bulk update/categorize/delete with dryRun and confirm)
- [x] Reference data tools (categories, merchants, tags, accounts, credit cards, households)
- [x] Report tools
- [x] Unit tests (mocked HTTP) + end-to-end integration test through the real API
- [x] `.mcp.json`, `apps/mcp/.env.example`, `create-dev-key` script (run for the dev user)
- [x] Docs: `apps/mcp/README.md`, `docs/api-keys-mcp/mcp.md`, architecture, AGENTS.md rule, root README
- [ ] Full verification, commit, rebase, push

## Decisions

- Better Auth stays on the 1.6 line (1.6.33); `@better-auth/api-key` ships separately and must match. `@better-auth/utils`, `@better-auth/core` and `better-call` are direct dependencies of `apps/api` so pnpm resolves a single copy (two copies break the plugin types).
- A key picks its household exactly like a session: `X-Household-Id` header, else the route's household param, else the user's default household.
- API keys cannot manage API keys (`requireAccess({ sessionOnly: true })`), to prevent privilege escalation.
- Keys are user-level (table has no `household_id`); every read/write filters by `reference_id`.
- Expiry is sent as `expiresInDays` (1 to 3650); no expiry by default.
- Better Auth is used for key generation, hashing, verification, expiry and rate limiting. Listing, rename, enable/disable and delete go through a thin repository on the plugin table (the plugin's own list/delete endpoints need a session cookie, and rename/enable are simple column updates).

- `GET /transactions/:id` was added to the contracts and API because agents need to read one transaction.
- The MCP end-to-end test lives in `apps/api` (needs the test DB harness) and imports `apps/mcp/src/testing/connect.ts`.
- Not done (future work): Dockerfile and Compose/Coolify service for the MCP HTTP transport.
