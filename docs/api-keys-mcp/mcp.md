# Luraba MCP server

`apps/mcp` lets AI agents (Claude Code, Claude Desktop, ...) work with a household through the
[Model Context Protocol](https://modelcontextprotocol.io). It calls the REST API with a personal API key
([api-keys.md](api-keys.md)), so an agent can do exactly what the key's owner can do in that household, no more.

## What it can do

- **Transactions**: `search_transactions`, `get_transaction`, `create_transaction` (income, expense, transfer,
  credit card purchase with installments), `update_transaction`, `delete_transaction`, and
  `create_refund` (refund, cancellation, chargeback or cashback: a credit with no source account, never income;
  on a card it lowers the invoice and restores the limit, on an account it raises the balance, and reports net
  it against the category), `cancel_purchase` (credit a card purchase once, or drop the unbilled installments and
  credit the billed ones), `create_credit_card_payment` (pay a card bill from an account; neutral in reports), and
  `bulk_update_transactions`, `bulk_categorize_transactions`, `bulk_delete_transactions`.
- **Card installments**: `create_transaction` for a `credit_card_purchase` takes `installmentAmounts` (exact amount of
  each installment, as the invoice shows them; the count is its length and the total its sum), or `installmentAmount` +
  `installments`, or `roundingMode` (`remainder_last` default, `remainder_first`, `round_up_all`) for an even split;
  `amount` becomes optional and an `amount` that disagrees with the installments is rejected. `update_card_purchase`
  edits a card purchase (text, category, merchant, tags, dates, total, count or the full installment list) and
  `update_installment` fixes one installment's amount or invoice by number; installments on closed invoices keep their
  amounts unless the full list is sent. Both support `dryRun`.
- **Transaction text**: every transaction has a short English `description` title (40 characters or less), an
  `originalDescription` (the bank's raw statement text, copied verbatim, never translated or cleaned) and free-form
  `notes`. `create_transaction`, `create_refund`, `cancel_purchase`, `create_credit_card_payment` and
  `update_transaction` accept the last two (`update_transaction` clears either with `null` and lists them in
  `changes`); every transaction the tools return includes all three. `search_transactions` `text` looks in all
  three, ignoring case and accents. `bulk_update_transactions` has `set.notes` (replace) and `set.appendNotes` (add
  a line; skipped when already present); `originalDescription` is not bulk-editable. A card purchase's text is
  shared by all its installments.
- **Recurring bills and budgets**: `create_recurring_bill`, `list_recurring_bills`, `update_recurring_bill`,
  `delete_recurring_bill` (a bill is a schedule; each period is an occurrence that is not a transaction and does
  not touch balances or spending until it is paid), `mark_bill_paid` (link an existing expense, create the
  expense from the bill with the actual amount, or just mark it paid; returns estimated vs actual),
  `report_bills` (per bill estimated, actual, due date and status, with totals) and `set_budget` (one month,
  or every month through `through`, leaving other categories alone). `create_transaction` links a new expense
  to a bill automatically when exactly one unpaid occurrence matches (same category or merchant, amount within
  25% of the estimate, due within 10 days; `linkBill=false` turns it off). Bills have no pay-from account and no
  "custom" frequency: choose the account when paying, and pick the closest frequency.
- **Goals and the monthly plan**: `create_goal`, `update_goal`, `list_goals`, `delete_goal` (needs `confirm`),
  `contribute_to_goal` (a transfer plus progress; other currencies store the FX rate used), `move_goal_funds`
  (progress unchanged), `withdraw_from_goal` (pays an expense or returns money to an account), `set_monthly_plan`
  (projected lines for a month or range), `report_safe_to_spend` (how much can I still spend this month in cash and
  next month on the card, one combined number in the base currency plus per currency; optional what-if `purchaseAmount` with `via` cash or card) and `report_monthly_plan` (projected vs actual per line: ask "how am I
  doing vs plan this month?"). Months are competency months: salary received on or after the 16th counts for the
  next month, or set `competencyMonth` on a transaction. Goals are not tied to an account; `report_goals` shows
  planned vs contributed this month, total progress, on-track and where each goal's money sits. To seed the
  owner's plan see `apps/api/src/modules/monthly-plans/README.md`.
- **Accounts and credit cards**: `create_account`, `update_account`, `delete_account`, `create_credit_card`,
  `update_credit_card`, `delete_credit_card`. An empty household can be set up from scratch: bank accounts
  (`type: "cash"`, or just `"checking"` / `"savings"`), investment, crypto, loan, property, vehicle and other
  assets or liabilities, each with an opening balance or value in major units, institution name and website (for
  the logo), notes and type-specific details (vehicle make/model/year/mileage, property address and area, loan
  terms). `update_account` also sets the current balance (`balance`, recorded as a balance adjustment, e.g. to
  revalue a car). Deleting an account or card needs `confirm: true` and first reports how many transactions and
  cards go with it. Not in the API, so not in the tools: a business-account flag, account color or icon, archiving
  or closing an account, changing an account's currency or a card's paying account.
- **Icons**: `list_icons` (optional `search`) lists the icon names a category can have; `create_category` and
  `update_category` take `icon` (an unknown name returns `needs_clarification` with close matches) and
  `update_category` takes `clearIcon`. `list_categories` returns each category's `icon` and `color`. In the app a
  subcategory with no icon shows its parent's icon. The list is `CURATED_ICON_CATALOG` in `@luraba/contracts`.
- **Categories**: a category can be a path, `Shopping > Electronics`, in `create_transaction` and the
  bulk tools; with `createMissing` the parent and child are created.
- **Reference data**: `whoami`, `list_households`, `list_accounts`, `list_credit_cards`, and list/create/update for
  categories, merchants and tags.
- **Reports**: `report_spending` (by category, merchant or tag), `report_income_expense`, `report_balances` (accounts
  and net worth: `combinedNetWorth` in the household base currency plus per currency), `report_credit_cards` (card count, what is owed this month, due dates; `combined` in the base currency plus `totals` per currency), `report_budget` (a parent category's `actual`, `remaining` and `overBudget` include its subcategories, as on the Budgets page; the parent also has `ownActual`, `allocated`, `unallocated` and `subcategories`, each with its `parent`),
  `report_goals`, `report_top_expenses`.
- **Resources**: `luraba://guide/overview` and `luraba://guide/transactions`.

Where rows show up: the Transactions page lists rows dated today or earlier. A credit card purchase is listed on the
day it was made (installment 1), and installments 2..n on the 1st of each following month, so on the 1st of a
month everything a plan owes that month is already listed. A purchase on Jan 15 in 6 installments lands on Jan 15,
Feb 1, Mar 1, Apr 1, May 1, Jun 1. The invoice closing and due dates stay on the invoice, which always lists its
own purchases, later installments included. Later installments show under **Upcoming** until their day. Rows created through the API or MCP appear
after a refresh (the page also refetches when you return to the tab).

Safety: destructive tools need `confirm: true`; bulk tools take `dryRun: true` and are capped at 300 rows;
ambiguous names return candidates (`needs_clarification`) instead of guessing; amounts are major units with a currency.

Example prompts: "How much do I owe on my credit cards this month?", "How many credit cards do I have?",
"How much money do I have in Chase?", "Create a checking account at Chase with $1,000, then log a $130 expense from it", "Create a $42.50 grocery expense at Whole Foods on my Chase checking",
"Recategorize every Uber transaction this year as Transport (dry run first)".

## Connect an AI client

Open **Settings > MCP**. It shows the endpoint (`<public URL>/mcp`, `http://localhost:3001/mcp` locally), a live
status badge, copy-paste setup for Claude Code, Claude Desktop / claude.ai, Codex and a generic JSON config (each
with OAuth or an API key) and the agents already connected.

### With OAuth (recommended)

```sh
claude mcp add --transport http luraba https://luraba.example.com/mcp
```

Then run `/mcp` in Claude Code and choose **Authenticate**. The client discovers the sign-in by itself: it reads
`/.well-known/oauth-protected-resource`, registers itself (dynamic client registration), and opens the browser. You
sign in to Luraba if you are not already, then a consent screen asks *"Allow <agent> to access your Luraba household
with these permissions?"*. After **Allow**, the agent gets an access token (30 days, refreshable for 90) that acts as
you: same household and role, same permission checks as an API key. **Settings > MCP > Connected agents** lists each
agent with when you allowed it and when it last called the API, and **Revoke** removes its access immediately.

### With an API key

Create a key in **Settings > API keys** (or `pnpm --filter @luraba/mcp create-dev-key` for local development, which
writes a key to the gitignored `apps/mcp/.env`) and send it as a bearer token:

```sh
claude mcp add --transport http luraba https://luraba.example.com/mcp --header "Authorization: Bearer lur_yourkey"
```

### Local stdio (no network hop)

The repository's [`.mcp.json`](../../.mcp.json) registers a `luraba` stdio server that reads `apps/mcp/.env`
(run `pnpm --filter @luraba/mcp create-dev-key` once) or `LURABA_API_URL` / `LURABA_API_KEY` from your environment.
Open the project in Claude Code and approve it, or run `/mcp`. From any folder:

```sh
claude mcp add luraba --env LURABA_API_URL=http://127.0.0.1:3001 --env LURABA_API_KEY=lur_yourkey -- pnpm --silent --dir /path/to/luraba/apps/mcp exec tsx src/index.ts
```

## How it is wired

```text
AI client --HTTPS--> <public URL>/mcp --(API proxy)--> mcp service :3333 --(Bearer, same token)--> API /api/v1
                     /.well-known/*, /api/auth/mcp/*, /oauth/consent: OAuth (Better Auth `mcp` plugin + web)
```

- The API serves `/mcp` by proxying to the MCP service (`MCP_INTERNAL_URL`); the MCP service never touches the
  database and forwards the caller's token to the API, which authenticates it like a session or an API key.
- The MCP service rejects missing or invalid credentials with `401` and
  `WWW-Authenticate: Bearer resource_metadata="<public URL>/.well-known/oauth-protected-resource"`, which is what makes
  an OAuth-capable client start the sign-in.
- OAuth is Better Auth's `mcp` plugin: discovery documents, dynamic client registration (`/api/auth/mcp/register`),
  authorization code with PKCE (S256 required), token and refresh. Two Luraba additions in `apps/api/src/modules/mcp`:
  the authorize endpoint is wrapped so a signed-out user is sent to `/login?next=...` and **every** agent must pass the
  consent screen (`/oauth/consent`), and OAuth bearer tokens are accepted by the access middleware next to API keys
  and sessions. Agents and API keys cannot manage agents, keys or consents (sessions only).

## Deployment

| Variable | Where | Purpose |
| --- | --- | --- |
| `BASE_URL` | API | The public origin (`https://luraba.example.com`). The MCP URL is `BASE_URL/mcp`; Settings > MCP shows it. Already required. |
| `MCP_INTERNAL_URL` | API | Where the API reaches the MCP service (`http://mcp:3333` in both Compose files; `http://127.0.0.1:3333` locally, and the default when `NODE_ENV=development`). Empty disables `/mcp` and shows "Not configured". |
| `LURABA_API_URL` | MCP service | The API's internal address (`http://api:3001`). |
| `MCP_PUBLIC_URL` | MCP service | Optional public MCP URL, used in the `WWW-Authenticate` header when no proxy sets `X-Forwarded-*` (the API does). |
| `MCP_TRANSPORT`, `MCP_HTTP_HOST`, `MCP_HTTP_PORT` | MCP service | `http`, `0.0.0.0`, `3333` (set by `apps/mcp/Dockerfile` and Compose). |

The gateway must send `/mcp*` and `/.well-known/*` to the API (Coolify's Caddyfile in `compose.coolify.yaml` does);
`/oauth/consent` and `/login` go to the web app like every other page. Details: [coolify.md](../coolify.md).

## Configuration (stdio and the MCP service)

| Variable | Default | Notes |
| --- | --- | --- |
| `LURABA_API_URL` | `http://127.0.0.1:3001` | API origin, without `/api/v1` |
| `LURABA_API_KEY` | none | `lur_...`; required for stdio |
| `LURABA_HOUSEHOLD_ID` | the key owner's default household | sent as `X-Household-Id` |
| `MCP_TRANSPORT` | `stdio` | `http` serves streamable HTTP on `MCP_HTTP_HOST:MCP_HTTP_PORT` (`127.0.0.1:3333`, `/mcp`) |
| `LOG_LEVEL`, `REQUEST_TIMEOUT_MS` | `info`, `30000` | logs go to stderr; the key is never logged |

With the HTTP transport each client sends its own `Authorization: Bearer ...` (API key or OAuth token); the server never falls back to a key of its own, so an anonymous caller gets a 401.
Put it behind TLS if it is not on localhost.

## Future work

Per-agent scopes (read-only agents), an audit log of agent writes, and remembering consent per agent so a returning client skips the screen.

## Local development

`pnpm dev` runs migrations (including `0052_oauth_mcp`) and starts the MCP service over HTTP on port 3333; the API
proxies `http://localhost:3001/mcp` to it by default, so Settings > MCP shows **Online** with no extra setup. If you
start the API by hand, run `pnpm --filter @luraba/api db:migrate` first and start `pnpm --filter @luraba/mcp dev`
too. Without the OAuth tables the connected-agents list is simply empty; without the MCP service the status says
**Offline**, and with `MCP_INTERNAL_URL` unset in production it says **Not configured**.
