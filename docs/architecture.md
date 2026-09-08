# Architecture

Luraba is a single product release composed of four workspace packages:

| Area | Responsibility |
| --- | --- |
| `apps/api` | Express endpoints, authentication integration, authorization, database access, migrations, and service internals |
| `apps/web` | Next.js UI, browser state, form state, and contract-backed API services |
| `packages/contracts` | Public HTTP endpoint definitions, request schemas, response resources, and wire types |
| `packages/domain` | Framework-free finance primitives shared safely between applications |

The API owns persistence. The contracts package owns the public REST boundary.
The web app must not redefine Luraba HTTP request, response, or resource types.
Better Auth SDK routes remain outside the REST contract registry.

Required product reference data is part of the database migration history. Mock
fixtures are development-only and never required for a working application.
