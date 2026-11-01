# mcp

Everything the API does for MCP clients (AI agents). The tools themselves live in `apps/mcp`; this module is the
user-facing management and the OAuth glue.

| File | What |
| --- | --- |
| `mcp.routes.ts` / `mcp.controller.ts` | `GET /mcp/server` (public MCP URL + live status), `GET /mcp/connections`, `DELETE /mcp/connections/:clientId`, `GET /mcp/clients/:clientId` (consent screen). All `sessionOnly`: an agent or API key cannot list or revoke agents. |
| `mcp.service.ts` | MCP URL (`BASE_URL/mcp`), health probe of `MCP_INTERNAL_URL`, connected-agent list and revoke. |
| `mcp.repository.ts` | Queries on the OAuth tables, always scoped by `user_id`. These tables have no `household_id`: tokens belong to a person, like API keys. |
| `mcp.auth.ts` | `extractOAuthToken` / `authenticateOAuthToken`: an OAuth access token resolves to its user through `auth.api.getMcpSession`, then follows the normal household + `requireAccess` path (no bypass). |
| `mcp.http.ts` | Express additions mounted before Better Auth: `/.well-known/oauth-*` discovery, the `/api/auth/mcp/authorize` wrapper (signed-out users go to `/login?next=...`, consent is always required) and the `/mcp` reverse proxy to `MCP_INTERNAL_URL`. |

OAuth itself is Better Auth's `mcp` plugin (`shared/lib/auth.ts`): dynamic client registration, authorization code +
PKCE (S256), token and refresh, tables `oauth_applications`, `oauth_access_tokens`, `oauth_consents` (migration
`0052_oauth_mcp`). The consent screen is `apps/web/app/oauth/consent`. Flow and deployment: `docs/api-keys-mcp/mcp.md`.

Tests: `__tests__/mcp.http.test.ts` runs the full flow (register, authorize, consent, token, use, list, revoke) and
the real MCP server behind the proxy.
