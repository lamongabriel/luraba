# api-keys

Personal API keys for scripts and AI agents (the MCP server in `apps/mcp` uses one). Built on the
Better Auth `@better-auth/api-key` plugin, configured in `shared/lib/auth.ts`.

## How a key authenticates

`middleware/access.middleware.ts` calls `extractApiKey` (`api-keys.auth.ts`) for every request:
`Authorization: Bearer lur_...` or `x-api-key: lur_...`. A bearer token without the `lur_` prefix is
ignored (session auth continues). A key is verified with `auth.api.verifyApiKey` (hash lookup,
enabled, expiry, per-key rate limit, usage counters, `lastRequest`) and resolves to its **owner
user**. From there the request takes the exact same path as a session: the household comes from
`X-Household-Id`, the route's household param, or the user's default household, the membership role
is loaded and `requireAccess({ permission })` checks the role's permissions. There is no bypass and
no extra privilege: a viewer's key cannot write, and a key cannot reach a household its owner is not
a member of.

Errors: invalid, disabled, expired or deleted key: `401`; rate limit: `429 RATE_LIMITED`.

## Management

User-level endpoints (`/api/v1/api-keys`, contract in `packages/contracts/src/api-keys`), all
`requireAccess({ sessionOnly: true })`: **API keys cannot create, list, change or delete API keys**
(a leaked key must not be able to mint more). Create goes through `auth.api.createApiKey` and returns
the secret exactly once; list never selects the secret or its hash (only `start`, the first 10
characters). Rename, enable/disable and delete are filtered by owner in `api-keys.repository.ts`.
`api_keys` has no `household_id`; it is reached through the owner (`reference_id`), not through
`HouseholdScopedRepository`.

## Settings

Prefix `lur_`, 600 requests per minute per key, optional expiry of 1 to 3650 days, label up to 80
characters. Change them in `shared/lib/auth.ts` and `packages/contracts/src/api-keys/requests.ts`.
Usage: [docs/api-keys-mcp/api-keys.md](../../../../../docs/api-keys-mcp/api-keys.md).

General module conventions: [../README.md](../README.md).
