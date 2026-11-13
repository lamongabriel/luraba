# @luraba/mcp

The Luraba MCP server: lets an AI agent (Claude Code, Claude Desktop, any MCP client) read and manage a
household. It is a **thin client of the REST API** built on `@luraba/contracts`. It never touches the
database, so every call goes through the same authentication, household selection and `requireAccess`
checks as the web app; the agent has exactly its key owner's permissions.

`Dockerfile` builds the HTTP service (`MCP_TRANSPORT=http`, port 3333) used by both Compose files; `pnpm dev` starts it too.

Setup and usage for humans: [docs/api-keys-mcp/mcp.md](../../docs/api-keys-mcp/mcp.md).

## Layout

| Path | What |
| --- | --- |
| `src/index.ts` | Entry. stdio by default, `MCP_TRANSPORT=http` for streamable HTTP. Loads `apps/mcp/.env` without overriding real env vars. |
| `src/config.ts` | Env validation (`LURABA_API_URL`, `LURABA_API_KEY`, `LURABA_HOUSEHOLD_ID`, ...). Errors name the variable, never its value. |
| `src/logger.ts` | pino to **stderr** (stdout carries the protocol in stdio mode), with the key redacted. |
| `src/client/` | `LurabaClient` (typed by the contract: validates requests and responses), `fetchAllPages`, error mapping. |
| `src/mcp/` | `createMcpServer` (low-level `Server`, tools + resources) and the zod to JSON Schema helper. |
| `src/http/app.ts` | Express + streamable HTTP. A session is bound to the bearer credential that opened it (API key or OAuth token, verified once against the API); missing or bad credentials get a 401 with `WWW-Authenticate: Bearer resource_metadata=...` so OAuth clients start the sign-in. Served publicly at `<base URL>/mcp` through the API proxy. |
<<<<<<< HEAD
| `src/tools/` | One file per area (`card-purchases.ts` the `update_card_purchase` and `update_installment` tools, `accounts.ts` holds the account and credit card write tools, `refunds.ts` the refund, purchase cancellation and card payment tools, `bills.ts` the recurring bill and budget tools, `bill-matching.ts` the auto-link of new expenses to bills, `goals.ts` the goal, goal funds and monthly plan tools, `safe-to-spend.ts` the left-to-spend report; `reports.ts` `report_budget` reuses `buildBudgetItems` from `@luraba/domain` so a parent's actual includes its subcategories exactly as the Budgets page shows it); `registry.ts` is the list the server exposes. |
| `src/format/` | Money (major units + currency), periods, transaction summaries. |
| `src/context/resources.ts` | `luraba://guide/...` resources an agent can read first. |
| `src/testing/connect.ts` | Connects a real MCP client to the real server in-process (tests). |
| `scripts/create-dev-key.ts` | `pnpm --filter @luraba/mcp create-dev-key`: dev key to the gitignored `.env`; never prints the secret. |

## Rules for tools

1. A tool is `defineTool({ name, title, description, input, annotations, handler })` in `src/tools/*.ts`,
   registered in `registry.ts`. Names are `snake_case` verbs. The description says what it answers and
   what to do on ambiguity; agents read it.
2. Tools call the API only through `context.client.request(endpoint, ...)` with a contract endpoint. Never
   redefine request/response types and never import API or DB code.
3. Amounts in and out are **major units with a currency** (`12.5`, `USD`); convert with `majorToMinor` /
   `toMoney`. Never mix currencies in one total.
4. Names for accounts, cards, categories, merchants and tags go through `context.refs.resolve*`. If a
   name is ambiguous or unknown, return `clarificationOutput(problems)` (status `needs_clarification`,
   nothing changed) rather than guessing. `createMissing` is opt-in.
5. Writes support `dryRun` where a preview is meaningful. Destructive tools (`DESTRUCTIVE` annotations)
   require `confirm: true`; bulk tools cap at `BULK_LIMIT` (300) and run with limited concurrency.
6. Return `{ summary?, data }`; failures that are the caller's to fix set `isError`. API errors are turned
   into agent-friendly messages by `describeApiError`; never include the key or raw upstream bodies.
7. A new public endpoint should consider an MCP tool. Add the tool, a unit test and, for flows that
   matter, a case in the end-to-end test.

## Tests

- `pnpm --filter @luraba/mcp test:unit`: config, name matching, periods, client and server with a mocked HTTP layer.
- End to end: `apps/api/src/modules/api-keys/__tests__/mcp.e2e.http.test.ts` (run with
  `pnpm --filter @luraba/api test:integration src/modules/api-keys`). It creates a user and a key through
  the API, starts the API on a port with the test database and drives the tools through a real MCP client.
  It lives in the API package because it needs the test database harness.

## Running test servers by hand

Start them on their own ports (for example API 3101, web 3100, MCP 3433) and stop only what you started: keep the
PID (`$!`) or use `lsof -tiTCP:<port> -sTCP:LISTEN | xargs kill`. Never `pkill -f` or `killall` with a command-line
pattern such as `src/server.ts`: it matches every worktree's processes, including a developer's own `pnpm dev`.
