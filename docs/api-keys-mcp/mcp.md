# Luraba MCP server

`apps/mcp` lets AI agents (Claude Code, Claude Desktop, ...) work with a household through the
[Model Context Protocol](https://modelcontextprotocol.io). It calls the REST API with a personal API key
([api-keys.md](api-keys.md)), so an agent can do exactly what the key's owner can do in that household, no more.

## What it can do

- **Transactions**: `search_transactions`, `get_transaction`, `create_transaction` (income, expense, transfer,
  credit card purchase with installments), `update_transaction`, `delete_transaction`, and
  `bulk_update_transactions`, `bulk_categorize_transactions`, `bulk_delete_transactions`.
- **Reference data**: `whoami`, `list_households`, `list_accounts`, `list_credit_cards`, and list/create/update for
  categories, merchants and tags.
- **Reports**: `report_spending` (by category, merchant or tag), `report_income_expense`, `report_balances` (accounts
  and net worth per currency), `report_credit_cards` (card count, what is owed this month, due dates), `report_budget`,
  `report_goals`, `report_top_expenses`.
- **Resources**: `luraba://guide/overview` and `luraba://guide/transactions`.

Safety: destructive tools need `confirm: true`; bulk tools take `dryRun: true` and are capped at 300 rows;
ambiguous names return candidates (`needs_clarification`) instead of guessing; amounts are major units with a currency.

Example prompts: "How much do I owe on my credit cards this month?", "How many credit cards do I have?",
"How much money do I have in Chase?", "Create a $42.50 grocery expense at Whole Foods on my Chase checking",
"Recategorize every Uber transaction this year as Transport (dry run first)".

## Connect it to Claude Code

1. Create a key in **Settings > API keys** (the secret is shown once). For local development run
   `pnpm --filter @luraba/mcp create-dev-key` instead: it creates a key for the oldest user in the dev database
   (or `LURABA_DEV_USER_EMAIL`) and writes it to the gitignored `apps/mcp/.env`.
2. The repository's [`.mcp.json`](../../.mcp.json) registers a `luraba` stdio server. Open the project in
   Claude Code and approve it (or run `/mcp`). It reads `apps/mcp/.env` automatically, or `LURABA_API_URL` /
   `LURABA_API_KEY` from your environment.
3. Equivalent manual registration from any folder:

```sh
claude mcp add luraba --env LURABA_API_URL=http://127.0.0.1:3001 --env LURABA_API_KEY=lur_yourkey -- pnpm --silent --dir /path/to/luraba/apps/mcp exec tsx src/index.ts
```

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `LURABA_API_URL` | `http://127.0.0.1:3001` | API origin, without `/api/v1` |
| `LURABA_API_KEY` | none | `lur_...`; required for stdio |
| `LURABA_HOUSEHOLD_ID` | the key owner's default household | sent as `X-Household-Id` |
| `MCP_TRANSPORT` | `stdio` | `http` serves streamable HTTP on `MCP_HTTP_HOST:MCP_HTTP_PORT` (`127.0.0.1:3333`, `/mcp`) |
| `LOG_LEVEL`, `REQUEST_TIMEOUT_MS` | `info`, `30000` | logs go to stderr; the key is never logged |

With the HTTP transport each client sends its own `Authorization: Bearer lur_...`; the env key is only a fallback.
Put it behind TLS if it is not on localhost.

## Future work

Docker image and Compose/Coolify service for the HTTP transport; OAuth-style key exchange for remote clients.
