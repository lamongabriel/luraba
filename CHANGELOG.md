# Changelog

## [1.4.0](https://github.com/lamongabriel/luraba/compare/v1.3.0...v1.4.0) (2026-10-31)


### Features

* **households:** role-based permissions UI, owner-takeover fix, household section and import wizard ([3412778](https://github.com/lamongabriel/luraba/commit/3412778ba97671d0cc25eaa6f2cec0e6775a3b19))
* **web:** add brand module, favicon/OG assets and page metadata on every page ([e07677a](https://github.com/lamongabriel/luraba/commit/e07677a031550e8dc2f1376c50cfecd384a91ec5))
* **web:** simpler household switcher with view, create and selection animation ([bb371b0](https://github.com/lamongabriel/luraba/commit/bb371b0929713022760a580c56c909db1711c5af))


### Bug Fixes

* **auth:** return the profile picture with the session and show it in the sidebar ([3bcf832](https://github.com/lamongabriel/luraba/commit/3bcf832823a191bc0977a087eba120122be77925))
* **dev:** wait for services on start and make BCB macro sync resilient ([dc905b8](https://github.com/lamongabriel/luraba/commit/dc905b8222c0731530a08c978bc12d41d0c8f319))
* **web:** stop the household switcher trigger from duplicating on select ([0522cc8](https://github.com/lamongabriel/luraba/commit/0522cc836c75e6f191e302a6cae81d9f2e7432c8))


### Performance

* **web:** build with Turbopack too ([2482b7a](https://github.com/lamongabriel/luraba/commit/2482b7a43cf6b6d2d9c995e8530ef207b81f55d7))
* **web:** per-icon hugeicons imports to shrink dev bundles ([087cf7c](https://github.com/lamongabriel/luraba/commit/087cf7cce6a3cb0cf3ec4576dd492bda9d617072))
* **web:** run the dev server with Turbopack ([ff50e58](https://github.com/lamongabriel/luraba/commit/ff50e58413f8b01b138aa6e5a7477044dfafab7d))

## [1.3.0](https://github.com/lamongabriel/luraba/compare/v1.2.1...v1.3.0) (2026-10-30)


### Features

* add Coolify Docker Compose deployment configuration ([8034f87](https://github.com/lamongabriel/luraba/commit/8034f87296a1d85f5ed160769c13b33088eb5324))
* **api:** add credit card overview, invoice payments and cycle changes ([004dc29](https://github.com/lamongabriel/luraba/commit/004dc29da9ac7c6424e212f1973d2ca43e81045c))
* **api:** add CSV and JSON exports through an exporter registry ([b1b43d3](https://github.com/lamongabriel/luraba/commit/b1b43d36d3627ea607f78dba8b778ed04b4db62e))
* **api:** add statement import with parsers, mapping, background worker and reconciliation ([d5ad1d9](https://github.com/lamongabriel/luraba/commit/d5ad1d9a172f6c8a4d341c57aac9213887f46b84))
* **api:** per-month credit-card budget settings and recognition restamping ([581f59e](https://github.com/lamongabriel/luraba/commit/581f59e89af226807d3d5f9a13a67a7094012e36))
* **api:** support account and merchant images with upload guards ([512a666](https://github.com/lamongabriel/luraba/commit/512a66692c7470c538d24c0c94d9f8181641f7cb))
* **api:** wire import and export routes and the import worker ([beb61b8](https://github.com/lamongabriel/luraba/commit/beb61b8dc5fd00fa1fbdb48793d9698f90148efc))
* **bills:** add recurring bills with occurrences, reminders and web UI ([bdb700a](https://github.com/lamongabriel/luraba/commit/bdb700ad3579cab43163d38e024756223ad21bd3))
* **charts:** add reusable chart components with state handling ([b7d9ce8](https://github.com/lamongabriel/luraba/commit/b7d9ce8454a73d237e0834b7373c549ef8f26fdc))
* **contracts:** add budget month settings endpoint and card timing option ([00a46d6](https://github.com/lamongabriel/luraba/commit/00a46d6fd159006f952a85d418739cdd47781c9c))
* **contracts:** add import, export, credit card overview and image contracts ([d38e38b](https://github.com/lamongabriel/luraba/commit/d38e38ba7893ebad098065824b3cfbbeb05962d5))
* **contracts:** add shared option catalogs ([c0fbbc8](https://github.com/lamongabriel/luraba/commit/c0fbbc8712a84dfab8c6623620b7d57f2cf65824))
* **db:** add budget month settings and a month-after-payment timing ([75b9ebe](https://github.com/lamongabriel/luraba/commit/75b9ebec16e1135425a0d4c52c3205a4e6b61634))
* **db:** add import tables and account and merchant image columns ([178043a](https://github.com/lamongabriel/luraba/commit/178043ae737c8366e2c54b3d7a9610e030cbd5e5))
* **domain:** add credit card helpers, shared money formatters and UTC date helpers ([932f54d](https://github.com/lamongabriel/luraba/commit/932f54d1b38dea1dc33446819bf49bfcf39bbe4c))
* **goals:** add savings and investment goals with contributions and estimates ([407c771](https://github.com/lamongabriel/luraba/commit/407c77105f9ffe4108efaa816574176fc1946758))
* **investments:** add investments API (accounts, assets, events, positions, taxes, allocation) ([1b88b82](https://github.com/lamongabriel/luraba/commit/1b88b82932c37807a1ad0a0bc5aed8f37c8dc20c))
* **investments:** add pluggable market-data layer and investments contracts ([a24f57d](https://github.com/lamongabriel/luraba/commit/a24f57da85c6b27dcc5b08f2f1a1c5f752ee3534))
* **investments:** add pure investments engine, schema and reference-data migration ([7d6e6df](https://github.com/lamongabriel/luraba/commit/7d6e6df51f5dad9f16fb8f43f059bb484a19d96d))
* **investments:** import B3/CSV/JSON statements and export investment data ([15c8934](https://github.com/lamongabriel/luraba/commit/15c8934d44b0e6a4448d797c7bff9ca649c11b10))
* **investments:** keep prices fresh with scheduled refresh jobs and background refresh on read ([6f10401](https://github.com/lamongabriel/luraba/commit/6f104017e2b2c10e634184b6ccaa2ff248bdf01d))
* **investments:** reminders, corporate-action suggestions, net-worth hook, scale and scenario tests ([d6ecc1b](https://github.com/lamongabriel/luraba/commit/d6ecc1b794c5e3aec84413f2b95b75166c0071d2))
* **investments:** web data layer, shared display components, dashboard and holdings pages ([13bf29f](https://github.com/lamongabriel/luraba/commit/13bf29f00020373a7bd757d67872af415078bccc))
* **investments:** web income, taxes, allocation, import/export, settings and tests ([abef443](https://github.com/lamongabriel/luraba/commit/abef443f103ff64bd6e9383fdda5b94fd3c0cf1a))
* **investments:** web transactions, accounts, asset detail, fixed income and forms ([9e550da](https://github.com/lamongabriel/luraba/commit/9e550daf82cff2ea1342223757c53eae1e48e0b8))
* **notifications:** add configurable alerts across in-app, email, push and SMS ([d4d69b6](https://github.com/lamongabriel/luraba/commit/d4d69b6e416ee437a0ead3ec3a6dcf6735574536))
* **queue:** add import queue and job names ([faf7c03](https://github.com/lamongabriel/luraba/commit/faf7c03cc80d3d07d8f25836df3a5596531f76c7))
* **splits:** add split payments with per-person installments, linking and write-offs ([eebc5b7](https://github.com/lamongabriel/luraba/commit/eebc5b76578b31c3a5880032e5acb6ced7948007))
* track who created records and add products with transaction items ([9af7ec9](https://github.com/lamongabriel/luraba/commit/9af7ec9c1aad76834faaf0ed9677af49c4fe086c))
* **transactions:** show unpaid and overdue bills in the upcoming feed ([66362ab](https://github.com/lamongabriel/luraba/commit/66362abe541d19a7a54bb3071d9159217cb64a15))
* **uploads:** add S3-compatible storage layer with uploads and attachments ([23b7bf3](https://github.com/lamongabriel/luraba/commit/23b7bf3bbf02d8be839f835c9feaec723472bfc6))
* **web:** add account images and entity image field ([c72d2fc](https://github.com/lamongabriel/luraba/commit/c72d2fc9985cfdef35917362824052aa9f2320ad))
* **web:** add credit card overview, invoices and card detail pages ([f9d4c80](https://github.com/lamongabriel/luraba/commit/f9d4c801cd31e3bb681ce398c1a3dba19b4e9164))
* **web:** add import and export wizard under settings ([1689c5a](https://github.com/lamongabriel/luraba/commit/1689c5a11a6fab449c67398d3a560d651cf44bde))
* **web:** add masked money, number and date inputs and use them in all forms ([4cf4eb0](https://github.com/lamongabriel/luraba/commit/4cf4eb0fc96b01a576e0edfd1aa66f5c95824ee1))
* **web:** add merchants page and merchant form with images ([feb1328](https://github.com/lamongabriel/luraba/commit/feb1328ead6b7d3599be9d32accee244575a520d))
* **web:** add shared display components for accounts, merchants, amounts, categories and tags ([5b583fc](https://github.com/lamongabriel/luraba/commit/5b583fc9a925860de4717766a3d0e9d8cb3af3cf))
* **web:** add the budget page with monthly plan and card settings ([fafd1d5](https://github.com/lamongabriel/luraba/commit/fafd1d55de2154d942b17686b0fa1cf02635eb6e))
* **web:** standardize option selects, KPIs and page states ([91047e9](https://github.com/lamongabriel/luraba/commit/91047e97b56e04e1f85e48fc6c517d0f420d21bb))
* **worker:** add BullMQ worker app and Redis queue package ([f39d160](https://github.com/lamongabriel/luraba/commit/f39d160f08230eca4dc2b1614fcfa4f2904cb3a3))


### Bug Fixes

* **api:** describe the investments write permission ([261e3f3](https://github.com/lamongabriel/luraba/commit/261e3f33544e6f3c17d37e8c7b33fd785f569671))
* **api:** make date-dependent tests stable and clear lint warnings ([1719d07](https://github.com/lamongabriel/luraba/commit/1719d070df12e45c02977c1c13a34593bef31ad1))
* **domain:** make startOfMonth and addMonths UTC and add shiftMonthKey ([39c8578](https://github.com/lamongabriel/luraba/commit/39c8578803f4715b45e54491f508ecd87dfa34d1))
* **investments:** correct annualized return, form defaults and total value ([902cf21](https://github.com/lamongabriel/luraba/commit/902cf21cf673e2c3dd97832466a6c138b1b437bd))
* **web:** restore credit card brand and preview components still imported ([900805a](https://github.com/lamongabriel/luraba/commit/900805a50e6db84d41cb6ed1f77483c4a8cbd657))


### Documentation

* add agent skills for React composition and view transitions ([248a2b7](https://github.com/lamongabriel/luraba/commit/248a2b7374ad55398735f82a65c1dd3b2d2f2637))
* add formatting guide and update architecture and agent guide ([bf65465](https://github.com/lamongabriel/luraba/commit/bf65465b44334ebb7ea75c6d5499a48811c9347c))
* clarify Coolify setup and hardcode DB name in compose ([3c71641](https://github.com/lamongabriel/luraba/commit/3c71641aafcedf7f8c581850862e22bfbb925e90))
* document the budget module for agents ([228232b](https://github.com/lamongabriel/luraba/commit/228232b7c119a896ad752c5b9d08bd52452ae29a))
* **investments:** user guide, progress, architecture and contracts notes ([346add4](https://github.com/lamongabriel/luraba/commit/346add4fd846fea026ffc9a236973dac07f6e95c))

## [1.2.1](https://github.com/lamongabriel/luraba/compare/v1.2.0...v1.2.1) (2026-09-08)


### Documentation

* add architecture, deployment, and development guides ([caee92b](https://github.com/lamongabriel/luraba/commit/caee92bdcf1d5860c30384282a99c6084c25e925))

## [1.2.0](https://github.com/lamongabriel/luraba/compare/v1.1.0...v1.2.0) (2026-09-04)


### Features

* add better timezone handling, country handling, create reusable api helpers ([1380807](https://github.com/lamongabriel/luraba/commit/13808079189ce605131347da91520d95a77f9bd7))
* add color-picker and credit-card UI components ([5ab8f05](https://github.com/lamongabriel/luraba/commit/5ab8f052192b5a8ed08261bccbccd86e62b045ba))
* add networth, recurring-bills, and reference-data modules ([f4df1b3](https://github.com/lamongabriel/luraba/commit/f4df1b321a734c22ca26fcef86dcd6d28debafb2))
* add new schemas, recurringBills, households and more ([e0f0d3d](https://github.com/lamongabriel/luraba/commit/e0f0d3d7d6ae5c843532cb67b293e48b7dbe4494))
* add tags and categories page ([5e0cecd](https://github.com/lamongabriel/luraba/commit/5e0cecde5b064a114a81570f43aed758fcb7c9a4))
* **analytics:** add KpiCard component with trend sparkline ([6d1bdee](https://github.com/lamongabriel/luraba/commit/6d1bdee24e594740513702d525e8ca8fc122e304))
* **categories:** add create/edit category form component ([080b4e1](https://github.com/lamongabriel/luraba/commit/080b4e1614eafdd668e09115b3cd35d4e65a5d36))
* **credit-cards:** add includeInBudget and tags support to purchases ([38f3ca8](https://github.com/lamongabriel/luraba/commit/38f3ca836102305c89949e7eb58f79d86b536041))
* **households:** add get, delete, and invite-by-id endpoints ([bc52ba7](https://github.com/lamongabriel/luraba/commit/bc52ba7122b68edf106799328e54cf1081bcef7b))
* **merchants:** add get merchant by ID endpoint ([b16da02](https://github.com/lamongabriel/luraba/commit/b16da026efe28fb0d6fc6d0db4f9587634c86b1b))
* **networth:** add net worth module with dashboard and analytics ([4f30a52](https://github.com/lamongabriel/luraba/commit/4f30a52dc2d844a5348744ca495a492a993165ff))
* setup monorepo ([ff5054d](https://github.com/lamongabriel/luraba/commit/ff5054dc7b45fc342a53b8870b1c7650df315ec8))
* update accounts, categories, and credit cards management ([23b8b98](https://github.com/lamongabriel/luraba/commit/23b8b98b5715c4201649d326fff987309cd56d82))


### Bug Fixes

* **sidebar:** only set data-active attribute when active ([d55fda5](https://github.com/lamongabriel/luraba/commit/d55fda5974410f93e1c2db743f21f5f9fd37107b))
* **ui:** use onSelect for command items and fix selected state styles ([964d70f](https://github.com/lamongabriel/luraba/commit/964d70fad54467d24ce4086f6c86ab3dd2a9ce99))


### Refactors

* **auth-forms:** remove redundant input and button styling ([e5ba4aa](https://github.com/lamongabriel/luraba/commit/e5ba4aa375f5700932b2fe07ad07a1a492b5d1a5))
* **contracts:** introduce typed endpoint definitions and PERMISSIONS constants ([00c4057](https://github.com/lamongabriel/luraba/commit/00c405703f20eef798d7fc6040bf61a95d42fa07))
* **credit-cards:** replace accountId with ownerAccountId and ledgerAccountId ([1f471ad](https://github.com/lamongabriel/luraba/commit/1f471ad75d755112c76b2aa3cf85fa4d077fe167))
* **onboarding:** replace country code enum with regex validation ([12b7e62](https://github.com/lamongabriel/luraba/commit/12b7e62ac2e7c78ec341a92480e8bc2c48437d0b))
* **transactions:** use AccountRecord type for balance adjustment input ([ea76ac3](https://github.com/lamongabriel/luraba/commit/ea76ac3190e87b37dacde46a101e266fbccef638))


### Documentation

* add root orchestration, agent skills, and compose updates ([58d499d](https://github.com/lamongabriel/luraba/commit/58d499d2b54cbb3f9adda5f02841f7ed7b0dd6e9))


### Continuous Integration

* update docker compose and dockerfile ([d8b7b48](https://github.com/lamongabriel/luraba/commit/d8b7b481362f400c64efb87864a669cd761f6e0f))

## [1.1.0](https://github.com/lamongabriel/luraba/compare/v1.0.0...v1.1.0) (2026-08-01)


### Features

* **accounts:** add transaction listing endpoint for non-credit-card accounts ([d85a756](https://github.com/lamongabriel/luraba/commit/d85a756e5f8bb959210f81781a62839cc3a5ae53))
* add better credit card support and start front-end rework ([facdda8](https://github.com/lamongabriel/luraba/commit/facdda8c6cc178d9529eb758f1dd6a6ce2bc5ada))
* add better-auth to the api ([5d88649](https://github.com/lamongabriel/luraba/commit/5d886498899d591e57873f9b6e0403149892b36b))
* add pagination and filtering to list endpoints ([5c1a913](https://github.com/lamongabriel/luraba/commit/5c1a913006f95e3175194a17fa4055f36c5cafab))
* **api:** add SMTP mail configuration to environment ([bf13377](https://github.com/lamongabriel/luraba/commit/bf13377b2d85cbf02276175cef64119f92be8e19))
* **api:** add SMTP mail service with household invitation template ([116d629](https://github.com/lamongabriel/luraba/commit/116d629e7e07ac5c82b97b56072384f94186578d))
* **auth:** wire up better-auth authentication flow in UI and add providers endpoint ([bef200e](https://github.com/lamongabriel/luraba/commit/bef200e9dadb9811384596abf4bfca9c2b0aa194))
* **data-table:** implement table system with URL-synced state, column filters and pagination ([396b420](https://github.com/lamongabriel/luraba/commit/396b4207aaf891d283af35729efe93628df04e92))
* **households:** implement token-based invite flow with resend and refresh ([cf82bf0](https://github.com/lamongabriel/luraba/commit/cf82bf04b2b161c705edf8239e388e6d406bb96c))
* **permissions:** add permission-based UI components and gating ([4e054d4](https://github.com/lamongabriel/luraba/commit/4e054d41114676d13fd94dfd746f042c0122f8d7))
* **ui:** add accounts management with create flow and supporting UI components ([455da59](https://github.com/lamongabriel/luraba/commit/455da599f92e28983200dc206d642370ca48a625))
* **ui:** add calendar, dialog, faceted, input-group and slider components primitives ([1ac0635](https://github.com/lamongabriel/luraba/commit/1ac0635984cb9d24c1f1b1c2d43c63894bd48ecf))
* **ui:** add HTTP interfaces and services for finance domain ([6626ff5](https://github.com/lamongabriel/luraba/commit/6626ff52fde54e41ef95a8e6b092772ab3d5dd91))
* **ui:** add passive API client and extract client factory function ([4eeb3ef](https://github.com/lamongabriel/luraba/commit/4eeb3ef7246d31099a643ad24cbf9f96a68daa92))


### Refactors

* **api:** remove default any type parameter from axios config interfaces ([68bf537](https://github.com/lamongabriel/luraba/commit/68bf5374ebe7b2b4dd12eca372cec5f321eb7647))
* **api:** simplify dev Dockerfile to standalone context ([c2b5e70](https://github.com/lamongabriel/luraba/commit/c2b5e7063d4f5202f609273f8f971302f1cf09d0))
* **ui:** remove dark mode variant classes from components ([79e688b](https://github.com/lamongabriel/luraba/commit/79e688b5eab87f2e36a60b1c0ef7930ed3ac045a))
* **ui:** remove route-dependent layout conditional from app layout ([e3e975f](https://github.com/lamongabriel/luraba/commit/e3e975fd4c07ac93acaadf0ddf3c01189c95e37a))
* **ui:** replace live queries with mock data for showcase ([4dcc355](https://github.com/lamongabriel/luraba/commit/4dcc355fe032b3226fb02ae1519fa6b57066ab6d))
* **ui:** update component styling for improved theme support ([195c1f6](https://github.com/lamongabriel/luraba/commit/195c1f6b12f7d1f53eecd566956f62c33eb5bde2))


### Build System

* **api:** restore workspace-root context in dev Dockerfile ([9a849cb](https://github.com/lamongabriel/luraba/commit/9a849cbb9740a6e0c5217c58a59244253019c8c0))


### Continuous Integration

* add GitHub Actions workflows for API build, check, and test ([3ad0f51](https://github.com/lamongabriel/luraba/commit/3ad0f5193caa3d85f1fc95f8a5ed7d76a058e13e))
* run workflows only on pull requests to main ([15bbe68](https://github.com/lamongabriel/luraba/commit/15bbe68e33b26ed6d9f80e2ddab8f9176ca67d02))

## 1.0.0 (2026-06-05)


### Features

* **accounts:** add institution logo URL to accounts schema and implement Brandfetch integration for logo retrieval ([bf72f3b](https://github.com/lamongabriel/luraba/commit/bf72f3be1269661d89893b1e3c0bfe0276f4a810))
* **accounts:** implement update and delete account functionalities with corresponding tests ([94de3d4](https://github.com/lamongabriel/luraba/commit/94de3d4b3b81105bb265ad84c7059e5241184de9))
* add ACCOUNT_TYPE_TO_CLASSIFICATION mapping for account classifications ([b526c5d](https://github.com/lamongabriel/luraba/commit/b526c5d043b29f54f929a2c6acd73bc94e7a4bb7))
* add api v1 ([8e0b0dd](https://github.com/lamongabriel/luraba/commit/8e0b0dd148dd7d56c80e52028763c712f6df8aef))
* add bruno endpoints for account testing ([d119708](https://github.com/lamongabriel/luraba/commit/d119708c3061e28336bd952302599c30aebcb734))
* add comprehensive tests for accounts service and routes, implement household-based access control ([9ec9d60](https://github.com/lamongabriel/luraba/commit/9ec9d604de0267bb0ed7d44bc53aba284a8ecda7))
* add credit card management schemas and utilities ([fdbabed](https://github.com/lamongabriel/luraba/commit/fdbabed273579c0ad890f0109599d814d2e83f89))
* add date module ([44ec73f](https://github.com/lamongabriel/luraba/commit/44ec73f0c78facf7e739d3542df7407076a1c283))
* add finance components and services ([3daba12](https://github.com/lamongabriel/luraba/commit/3daba121fcbb6c7a2b2b59c6f769c0e45ae8507b))
* add metadata configuration for improved SEO and social sharing ([8ea2de1](https://github.com/lamongabriel/luraba/commit/8ea2de1da42587934150bb326bf262f8e3a5bf7b))
* add missing bruno requests ([d1e01d6](https://github.com/lamongabriel/luraba/commit/d1e01d62c942f0bde3cf1db907424e303a4d6f0d))
* add new folder structures for accounts, auth, categories, currencies, payment methods, and transactions; remove get balance endpoint ([d430d2a](https://github.com/lamongabriel/luraba/commit/d430d2a1c18e4a28c1ed690d974472768e0be3c1))
* app init ([8da974d](https://github.com/lamongabriel/luraba/commit/8da974d8d5105c437777f1c26fee69b0d3f694b2))
* **auth:** improve user registration and login functionality ([41ea3a2](https://github.com/lamongabriel/luraba/commit/41ea3a252357e72674630759c29b2a70f4522c99))
* **budgets:** add budget management endpoints and related functionality ([6770c09](https://github.com/lamongabriel/luraba/commit/6770c091e91b736c4ce11f628cca9c2ca1bc6ee3))
* **categories:** add color and icon fields to categories, update related schemas and routes ([30c226c](https://github.com/lamongabriel/luraba/commit/30c226c465ab9def04b0df6044847a1d00414fbc))
* **categories:** implement update and delete category functionalities with corresponding tests ([6aacad6](https://github.com/lamongabriel/luraba/commit/6aacad60cf3d68f68227d3d747a3cebba612cc9c))
* **controller:** add support for 'no-content' response status in sendResponse and createHandler ([da8ba64](https://github.com/lamongabriel/luraba/commit/da8ba64da2f547326552137448e70d2091c93361))
* **controller:** enhance createHouseholdHandler to support 'no-content' status ([d61c88d](https://github.com/lamongabriel/luraba/commit/d61c88d54fbbb11fa2e0412d182888ddefd9e792))
* **controller:** update createAuthenticatedHandler to handle 'no-content' status ([08fdce9](https://github.com/lamongabriel/luraba/commit/08fdce980a54c1bc38c075584e2cda6cf7abe175))
* **currencies:** add bulk precision lookup by currency codes ([a0c7639](https://github.com/lamongabriel/luraba/commit/a0c7639e6f83811417b814b74a5f199b4f30740d))
* **currencies:** implement currency listing and exchange rate retrieval with validation ([0727c91](https://github.com/lamongabriel/luraba/commit/0727c910124f7a968622be8904e5f7b9d41c78c8))
* **db:** convert monetary amount columns from integer to bigint ([9b0c1c2](https://github.com/lamongabriel/luraba/commit/9b0c1c2f6544f96cf074f0770685048a4c4f16f4))
* **docker:** upgrade Node.js version to 22-alpine in Dockerfiles and update package.json engine requirement ([c85fbff](https://github.com/lamongabriel/luraba/commit/c85fbff7fb76ab04e4c45066ae78a64ec595b769))
* enhance login and registration pages with improved layout and typography ([9c6b541](https://github.com/lamongabriel/luraba/commit/9c6b541f187171fab75d35ad6f152dc7ae7eb594))
* **entries:** implement entries module with double-entry balance enforcement ([e578a6a](https://github.com/lamongabriel/luraba/commit/e578a6a407a2e52b5240d0670070b2115c8b04ac))
* **environment:** update access token and add currency conversion ([33726de](https://github.com/lamongabriel/luraba/commit/33726dea7f9a6ccf99410df0d8631bd7feacf9e6))
* **error:** enhance Zod error formatting in error middleware ([8c8e57a](https://github.com/lamongabriel/luraba/commit/8c8e57aa60d6122c49a1035d328bd01aeaf35503))
* **health:** implement health check endpoint and related services ([b09fe52](https://github.com/lamongabriel/luraba/commit/b09fe52ccd1ab4270baf83e9d0c8281b81a88976))
* **households:** implement CRUD operations and invite management for households ([087cd4c](https://github.com/lamongabriel/luraba/commit/087cd4c2fc6a806f453751420c73cf95df4ebdec))
* implement access middleware and related controllers for household management ([3ecffa4](https://github.com/lamongabriel/luraba/commit/3ecffa4e79573666cd78154728f8f6450a8522e4))
* implement authentication redirection and loading screen handling ([53159d8](https://github.com/lamongabriel/luraba/commit/53159d85bea47ce7ef3de100c88686fa05407dc0))
* implement foreign exchange service with Yahoo Finance and Frankfurter providers ([217d4e8](https://github.com/lamongabriel/luraba/commit/217d4e81d898bc66375b0191360ecb11241cc5c6))
* **integrations:** implement Brandfetch integration with encryption and related services ([d88a78c](https://github.com/lamongabriel/luraba/commit/d88a78ce1849601dc8b6734ca7e69817b28af9e8))
* **merchants:** implement CRUD operations and routes for merchants management ([83b6549](https://github.com/lamongabriel/luraba/commit/83b65499dc8573f0c239afa2d9eb687eab0205cc))
* **merchants:** implement update and delete functionalities for merchants with corresponding tests ([a954f02](https://github.com/lamongabriel/luraba/commit/a954f028121b7829d08c29e98acdc684c1bb71e4))
* **migration:** add migration for altering exchange_rates table columns ([a23d9cf](https://github.com/lamongabriel/luraba/commit/a23d9cf721e72e701877de424184fcb05262cd10))
* **onboarding:** implement onboarding options endpoint and related services ([e51b4c4](https://github.com/lamongabriel/luraba/commit/e51b4c46b35a7b6a5ea6ee18121f1beb5bad437e))
* **payment-methods:** implement CRUD operations and permissions for payment methods with corresponding tests ([82e334c](https://github.com/lamongabriel/luraba/commit/82e334c7910f0db8e20c335e14fea1c84277ac7b))
* **permissions:** add tags and integrations permissions to household roles ([093575c](https://github.com/lamongabriel/luraba/commit/093575c80ac225c8a5b7712585d8700f355d9815))
* refactor api core ([f70ae37](https://github.com/lamongabriel/luraba/commit/f70ae37ee096f1dd96a42cc8aa954b513ecbb22d))
* refactor user-related schemas to household-based structure ([8c50110](https://github.com/lamongabriel/luraba/commit/8c501105a5c91146a3bcdf2c3a7d9e373e1ba32e))
* reworks ([09e0b51](https://github.com/lamongabriel/luraba/commit/09e0b518175a43316035171f009ed4bcb3d4a6b6))
* **schema:** update exchange_rates table to use bigint for rate numerator and denominator ([76ae8d5](https://github.com/lamongabriel/luraba/commit/76ae8d582a0deced3371455c7b1be4ceb805a6eb))
* **tags:** add bulk tag lookup by IDs within household context ([bbb5cae](https://github.com/lamongabriel/luraba/commit/bbb5caeb1e3672adf68175bf11724786c623984d))
* **tags:** add color and icon fields to tags, implement related routes, services, and tests ([361fcd9](https://github.com/lamongabriel/luraba/commit/361fcd9333e59b2fced62277ef132fe217f956fd))
* **tags:** implement update and delete tag functionalities with corresponding tests ([716904b](https://github.com/lamongabriel/luraba/commit/716904b4832f4db33e3c1ca3214e25931274fc68))
* **tests:** update test database setup and add payment method seeding ([cd69001](https://github.com/lamongabriel/luraba/commit/cd69001572c5624599fc011de7a488584fffac53))
* **transactions:** implement full transactions CRUD with transfer, adjustment, and offshore transfer support ([f41da15](https://github.com/lamongabriel/luraba/commit/f41da154ae7b5f79d0a7059e58d04b47fe8abfb4))
* update .gitignore to include additional files and directories ([be2ddd1](https://github.com/lamongabriel/luraba/commit/be2ddd1d8afc1755c25f4d853a6c9d53520c5df1))
* update global styles for improved dark mode support and visual enhancements ([d135aae](https://github.com/lamongabriel/luraba/commit/d135aaed5655b7beaf8eab8c621a40fc71a5e169))
* **validation:** add Zod schemas for monetary amount and balance fields ([bd7d834](https://github.com/lamongabriel/luraba/commit/bd7d83406ac14b7be67a403e917e3a821087d7a6))


### Bug Fixes

* update test file inclusion pattern in vitest configuration ([4dbec4b](https://github.com/lamongabriel/luraba/commit/4dbec4b981c24cacb11ef38b4016499f1532229f))


### Refactors

* **accounts:** extract ledger and currency queries into dedicated repositories ([c7a5376](https://github.com/lamongabriel/luraba/commit/c7a5376f862f5499766888233481454cbe64f453))
* **api:** migrate budgets and credit-cards modules to household-scoped access control ([084bc8c](https://github.com/lamongabriel/luraba/commit/084bc8c3d069f9f697b7e83c765f855023f18a25))
* **auth:** update imports for householdsRepository and clean up unused householdSettingsSchema ([0c8e36d](https://github.com/lamongabriel/luraba/commit/0c8e36d3924d2eb9a7febeb6d696c443fdac40ec))
* change bigint to number for monetary values across schemas and services ([a08476f](https://github.com/lamongabriel/luraba/commit/a08476f2a80d95954477f4a7f9956c3fae857403))
* consolidate and update schema imports, remove unused files, and introduce new enums ([56a1836](https://github.com/lamongabriel/luraba/commit/56a1836fd11dca9d7d2076407ab6f39290379f9b))
* **fx:** extract currency queries from fx repository into dedicated currency repository ([77aef17](https://github.com/lamongabriel/luraba/commit/77aef17a3460f1a673cf716b2e2253709d5e8f84))
* **health:** replace timestampSchema with direct z.iso.datetime() usage for clarity ([3e31dc1](https://github.com/lamongabriel/luraba/commit/3e31dc147f8eb12cb20cbb518237eb7805189903))
* **payment-methods:** delegate currency and transaction queries to dedicated repositories ([d1cb82b](https://github.com/lamongabriel/luraba/commit/d1cb82bddcc6a299a3afcefc3dc836c424e7d089))
* restructure API application and routing and add testing support ([fad0c0f](https://github.com/lamongabriel/luraba/commit/fad0c0fe902ac84e79b07a0faddaec52e70600cf))


### Documentation

* **bruno:** update request bodies to reflect revised transaction API fields ([e764612](https://github.com/lamongabriel/luraba/commit/e764612c3df81b3c87af37a24492da251d155a95))


### Build System

* config biomejs in the api app ([a0d9e74](https://github.com/lamongabriel/luraba/commit/a0d9e7404b72a136aa18e2c20f416b9a6214bf65))
* initialize husky monorepo workspace ([547efa8](https://github.com/lamongabriel/luraba/commit/547efa8f64c939c83254a4f89ce1380dbd8ed57d))
* **test:** add unit test configuration and npm script ([bea94f9](https://github.com/lamongabriel/luraba/commit/bea94f9975c4d5be56547e72a1c8ecaf37ccb26d))


### Continuous Integration

* add release automation, commitlint, and project metadata ([47e97e9](https://github.com/lamongabriel/luraba/commit/47e97e986907ae3474deb040ba7876f823f3d3f6))
* **api:** add GitHub Actions workflow with lint, typecheck, and test pipeline ([0cf388c](https://github.com/lamongabriel/luraba/commit/0cf388c2308de78b7bb97caec4093f032f4b5bec))
* remove explicit pnpm version pin from workflow setup steps ([84e50be](https://github.com/lamongabriel/luraba/commit/84e50be51829fcc2ae24c57db2affd3de7eeb1c6))

## Changelog

This changelog is maintained by Release Please.
