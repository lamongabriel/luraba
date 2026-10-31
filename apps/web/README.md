# Luraba Web

The `@luraba/web` workspace is Luraba's private Next.js application. It owns
React components, shadcn primitives, browser state, and page-specific UI code.

Run focused commands from the repository root:

```bash
pnpm --filter @luraba/web dev
pnpm --filter @luraba/web check
pnpm --filter @luraba/web typecheck
pnpm --filter @luraba/web test:unit
pnpm --filter @luraba/web build
```

Shared HTTP contracts come from `@luraba/contracts` and framework-free finance
helpers come from `@luraba/domain`. Keep API persistence and server-only
authorization logic in `apps/api` instead of importing it into this workspace.

## Dev performance

`pnpm dev` runs Turbopack (`next dev`); `build` uses it too (12 s cold). On this app Turbopack serves ~1 MB
client chunks per page versus ~16 MB with webpack dev, and compiles routes in about a second.
If a change only misbehaves in Turbopack, run `next dev --webpack` or `next build --webpack` to compare.

`@hugeicons/core-free-icons` ships one 20 MB index holding ~5,400 icons, and webpack dev mode does
not tree-shake it, so every page chunk used to carry all of them (30+ MB per chunk, GBs of RAM and
swap). `next.config.mjs` rewrites named imports to per-icon modules (`modularizeImports`), which
needs each imported name to have its own file. Import the real icon name (`Search01Icon`), not a
barrel alias (`SearchIcon`); use `import { Search01Icon as SearchIcon }` if you want a local alias.
A missing file shows up as `Can't resolve '@hugeicons/core-free-icons/<Name>'`.

## Structure

| Folder | Role |
| --- | --- |
| `app/` | Next.js routes. `(app)` is the authenticated shell, `(guest)` login/signup, `(public)` invite previews. |
| `services/` | One file per API area. Thin functions over `requestContract(endpoint, ...)`; types come from `@luraba/contracts`. Multipart uploads are the one hand-written call (`uploads.service.ts`). |
| `queries/<area>/` | TanStack Query hooks plus a `xQueryKeys` object per area. |
| `mutations/<area>/` | `createAppMutationDefinition` + `useAppMutation` hooks (toasts and error handling built in); invalidate the area's query keys on success. |
| `components/<area>/` | UI by feature. `ui/` holds shadcn primitives; `forms/`, `side-panel/`, `data-table/`, `filters/` are shared building blocks. |
| `components/permissions/` | `PermissionButton`, `PermissionGuard`, `Can`, `useCan`: gate UI with the same `PERMISSIONS` the API enforces. |
| `config/`, `stores/`, `lib/`, `hooks/` | Env, zustand stores (auth session), pure helpers, shared hooks. |
| `api/` | The axios clients (sends cookies and the active `X-Household-Id`). |

Adding data to a screen: service function -> query hook (+ key) -> component; writes: mutation hook
that invalidates the key. Reusable file/attachment UI is documented in
[components/uploads/README.md](components/uploads/README.md).

**Page states and KPIs (mandatory).** Every data page has `_loading.tsx`, `_error.tsx` (and `_empty.tsx` for lists) built with [components/states](components/states/README.md); headline numbers use [components/kpi](components/kpi/README.md). Skeletons match the loaded page one to one.

**Display components (mandatory).** Accounts, credit cards, transaction types, merchants, products, amounts, currencies, categories and tags are shown with [components/display/](components/display/README.md), never hand-built. Currency, country, language, time zone and date-format choices use the shared selects there (`CurrencySelect`, `CountrySelect`, ...) backed by [contracts catalogs](../../packages/contracts/src/catalogs/README.md).

Credit cards UI (month overview, card detail, invoices): [components/credit-cards/README.md](components/credit-cards/README.md).

Budget UI (monthly plan, card settings): [components/budgets/README.md](components/budgets/README.md).

**Page metadata (mandatory).** Every `page.tsx` exports `metadata = pageMetadata({ title, description })` (`lib/metadata.ts`; client pages do it in their same-folder `layout.tsx`). The root layout supplies the `| Luraba` suffix, Open Graph, Twitter and icons; the logo and brand assets live in [components/brand](components/brand/README.md). Enforced by `test/conventions.test.ts`.

**Page titles.** Every page in `(app)` renders `InternalPageLayout` (which wraps `components/finance/page-header.tsx`):
`title`, a mandatory `subtitle`, an optional `back={{ href, label }}` ("Back to {label}", use it on every detail page) and an
`actions` slot aligned with the title. Do not build one-off headers.
