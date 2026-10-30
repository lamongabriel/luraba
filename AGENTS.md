# Agent guide

Luraba is a self-hosted personal-finance workspace: a pnpm + Turborepo monorepo with an
Express API, a Next.js web app, a BullMQ worker and shared packages.

**Read the README of the folder you are about to change before you change it.** They record the
conventions that are not obvious from the code. When you add a module, component group or package,
add its README in the same change, and update the READMEs you rely on if the rules move.

> ## STOP: reuse before you build (web app)
>
> **Before writing any UI, search `apps/web/components` for something that already does it** (KPI cards,
> empty states, error states, loading skeletons, tables, filters, sheets, selects). Search by name and by
> behavior, in more than one folder. If one fits, use it. If it almost fits, **extend that component** so
> every page benefits; never copy it or build a page-local variant. Only if nothing exists, create a new
> reusable component in the shared folder, document it in that folder's README, and use it from the page.
>
> **Every page and data section has three states, built from the shared components, not by hand:**
> `loading` (skeleton), `error` (retryable) and `empty`. The loading skeleton must match the loaded page
> **one to one** (same grid, card sizes, row heights, headers); if the layout shifts by a single pixel
> when data arrives, the page is wrong. Assume the page always has a scrollbar. KPIs use the shared KPI
> cards component, empty states the shared empty state (as on tags and categories), errors the shared
> `ErrorState`. Details: [components/kpi](apps/web/components/kpi/README.md) and
> [components/states](apps/web/components/states/README.md); enforced by `apps/web/test/conventions.test.ts`.

> ## STOP: never hand-render these in the web app
>
> **Accounts, credit cards, transaction types, merchants, products, amounts (money with sign and color),
> categories and tags are always rendered with the shared components in
> [`apps/web/components/display/`](apps/web/components/display/README.md)**: `AccountDisplay`,
> `TransactionTypeDisplay`, `MerchantDisplay`, `ProductDisplay`, `AmountDisplay`, `CategoryDisplay`, `TagDisplay`, `CurrencyDisplay` and
> `MemberDisplay` (who created a record).
> Do not build your own avatar, icon, badge, chip or colored money text for these, in tables, drawers,
> cards or forms. Icons, colors, labels and sizes live in `components/display/constants.ts`; change
> them there and the whole app follows. If a case is missing, extend that folder instead of working
> around it. Read its README before touching any UI that shows these things.

## Where to read

| You are touching | Read first |
| --- | --- |
| Anything (layout, commands, workflow) | this file, then [README.md](README.md) and [docs/architecture.md](docs/architecture.md) |
| An API endpoint, service or repository | [apps/api/README.md](apps/api/README.md) and [apps/api/src/modules/README.md](apps/api/src/modules/README.md) |
| Controllers, repositories, list/query helpers, errors, responses | [apps/api/src/shared/README.md](apps/api/src/shared/README.md) |
| A specific API module | `apps/api/src/modules/<module>/README.md` |
| API tests | [apps/api/src/test/README.md](apps/api/src/test/README.md) |
| Database tables or migrations | [packages/db/README.md](packages/db/README.md) |
| HTTP contracts, permissions, wire types | [packages/contracts/README.md](packages/contracts/README.md) |
| File uploads, attachments, storage backends | [docs/storage.md](docs/storage.md), [packages/storage/README.md](packages/storage/README.md), [apps/api/src/modules/uploads/README.md](apps/api/src/modules/uploads/README.md) |
| Money, dates, recurrence | [packages/domain/README.md](packages/domain/README.md) |
| Formatting numbers, money, dates; number and date inputs | [docs/formatting.md](docs/formatting.md) (**mandatory**) |
| Notifications, queues, the worker | [packages/notifications/README.md](packages/notifications/README.md), [packages/queue/README.md](packages/queue/README.md), [apps/worker/README.md](apps/worker/README.md) |
| Budget page (monthly plan, card settings) | [apps/web/components/budgets/README.md](apps/web/components/budgets/README.md), [apps/api/src/modules/budgets/README.md](apps/api/src/modules/budgets/README.md) |
| Credit cards UI (overview, card detail, invoices) | [apps/web/components/credit-cards/README.md](apps/web/components/credit-cards/README.md) |
| The web app | [apps/web/README.md](apps/web/README.md) (data layer, components, forms, permissions) |
| Choosing or showing a currency, country, language, time zone, date format, default period or theme | [packages/contracts/src/catalogs/README.md](packages/contracts/src/catalogs/README.md) and the selects in [display](apps/web/components/display/README.md) (**mandatory**) |
| A page's loading, error or empty state; skeletons | [apps/web/components/states/README.md](apps/web/components/states/README.md) (**mandatory**) |
| KPIs / headline numbers | [apps/web/components/kpi/README.md](apps/web/components/kpi/README.md) (**mandatory**) |
| Showing an account, card, transaction type, merchant, product, amount, category or tag | [apps/web/components/display/README.md](apps/web/components/display/README.md) (**mandatory**) |
| Products and transaction items (UI) | [apps/web/components/products/README.md](apps/web/components/products/README.md), [apps/api/src/modules/products/README.md](apps/api/src/modules/products/README.md) |
| Reusable upload UI (galleries, cropper) | [apps/web/components/uploads/README.md](apps/web/components/uploads/README.md) |
| Settings / Household pages, cards, section menus | [apps/web/components/section/README.md](apps/web/components/section/README.md) |
| Importing statements (OFX/CSV) or exporting data | [apps/api/src/modules/imports/README.md](apps/api/src/modules/imports/README.md), [apps/api/src/modules/exports/README.md](apps/api/src/modules/exports/README.md), [apps/web/components/imports/README.md](apps/web/components/imports/README.md) |
| Deployment (Compose, Coolify) | [docs/deployment.md](docs/deployment.md), [docs/coolify.md](docs/coolify.md) |

## Rules that always apply

0. **Shared option sets live in `@luraba/contracts`, not the web app.** Currencies, countries, time
   zones, languages, date formats, periods, themes and any other enum that is stored or validated by
   the API are defined once in `packages/contracts` (`src/catalogs`), imported by the API and the web.

1. **Contract first.** A public endpoint is defined once in `packages/contracts` (`defineEndpoint`)
   and consumed by both the API controller and the web service. The web app never redefines
   request/response types. Every non-204 endpoint has a response schema, and the inventory in
   `packages/contracts/src/__tests__/contracts.test.ts` must be updated when you add one.
2. **Household data goes through `HouseholdScopedRepository`.** Any table with a `household_id`
   column extends it (get/create/update/delete are filtered by household for you). Never write an
   update or delete by `id` alone on household data. Tables without a household column (child rows,
   or rows that can be personal) are reached through a parent you already loaded, and say so in the
   module README.
3. **Layering.** route -> controller (`createHouseholdHandler` / `createAuthenticatedHandler`) ->
   service (business rules, returns wire shapes) -> repository (SQL only). Controllers contain no
   logic; repositories contain no rules.
4. **Authorization.** Routes use `requireAccess({ permission })`. New capabilities add a permission
   in `packages/contracts/src/permissions.ts` and a role mapping there.
5. **Migrations are hand-written SQL** plus a `_journal.json` entry (`drizzle-kit generate` is
   broken here). Apply with `pnpm --filter @luraba/api db:migrate`.
6. **Tests.** API integration tests run with `pnpm test:integration` from `apps/api`, which loads
   `.env.test`. Never run vitest with `RUN_DB_TESTS=1` directly: it would hit the dev database.
7. **Drizzle gotcha.** Inside a subquery, a column of the outer table renders unqualified and
   resolves to the inner table. Qualify it by hand (see `uploads.repository.ts`).
8. **Files** are stored through `@luraba/storage` and the uploads module, never by writing to disk
   or calling S3 directly. Attach files to records with the attachment registry
   (`packages/contracts/src/uploads/catalog.ts`).
9. **Docs travel with code.** Behavior changes update the nearest README and, for architecture
   level changes, `docs/architecture.md`.
10. **Git.** Commit only when asked. Stage files by name (never `git add -A`). Conventional commit
    messages (`feat(scope): ...`) are enforced by commitlint.

11. **English only, American examples.** All UI text is English, never Portuguese or another language
    (translate terms: "fatura" = invoice, "limite" = credit limit, "vencimento" = due date). Placeholders,
    tooltips, tests and sample data use American names and institutions (Chase, American Express,
    John Doe, Chris, Mike), never Portuguese names or Brazilian banks.
12. **Shared display components.** Anything that shows an account, credit card, transaction type,
    merchant, amount, category, tag or the member who created a record uses `apps/web/components/display/`
    (see the banner at the top).
    Currencies, countries, languages, time zones and date formats are chosen with `CurrencySelect`,
    `CountrySelect`, `LanguageSelect`, `TimeZoneSelect` and `DateFormatSelect` (and shown with
    `CurrencyDisplay`), fed by `packages/contracts/src/catalogs` (shared with the API); never build those options in a page, and keep
    option labels capitalized and in the catalog.
    Account types live in one catalog (`ACCOUNT_TYPE_DISPLAY`): a new account type or subtype adds its
    label, icon and color there, never inline in a page.
13. **Numbers, money and dates are shared.** Money text goes through `formatMoney` /
    `AmountDisplay`, numeric inputs through `MoneyInput` / `NumberInput` / `DateInput` (never
    `type="number"`), dates through the UTC helpers in `@luraba/domain`. See
    [docs/formatting.md](docs/formatting.md).

## Commands

```sh
pnpm dev                     # db + redis + minio, migrations, then api/web/worker watchers
pnpm typecheck               # whole workspace
pnpm check                   # biome (lint + format)
pnpm fix                     # biome --write
pnpm test                    # unit + API integration tests
pnpm --filter @luraba/api test:integration src/modules/<module>
```
